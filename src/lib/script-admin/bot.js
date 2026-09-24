import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { getAllScriptsFromNotion } from '@/lib/scripts';
import { publicScriptFingerprint } from '@/lib/script-public-verification';
import { getCharacterImageStorageBase } from '@/lib/characterMedia';
import { requireScriptBot } from './auth';
import {
  DEFAULT_COVER_BUCKET, DEFAULT_COVER_MAX_BYTES, SCRIPT_COLUMNS,
  SCRIPT_TABLE, SCRIPT_VERSION_COLUMNS, SCRIPT_VERSION_TABLE,
} from './constants';
import { conflict, databaseError, invalidRequest, notFound, unavailable } from './errors';
import { adminJson, readAdminJson, requireSafeMutationOrigin, scriptAdminErrorResponse } from './http';
import { revalidatePublishedScript } from './revalidate';
import { createDraftScript, getCatalogScript, publishCatalogScript, retryCatalogScriptSync, updateDraftScript } from './service';
import { extractScriptContentInput, mergeScriptContent, normalizeScriptContent, requireUuid, slugifyScriptName } from './validation';
import {
  BotContractError, botMediaPath, botRequestMetadata, imageBytesMatchType,
  normalizeBotMediaInput, publishedCatalogMatches, requireBotDraftOwnership,
  requireBotExpectedVersion, sameCharacterMedia, validateBotJobKey, validateBotJobState, validateBotPublishContent,
} from './bot-contract';

export function botErrorResponse(error) {
  if (error instanceof BotContractError) {
    return adminJson({ error: error.message, code: error.code }, { status: error.status });
  }
  return scriptAdminErrorResponse(error);
}

export function botContext(request, { mutation = false } = {}) {
  if (mutation) requireSafeMutationOrigin(request, { allowBearerWithoutOrigin: true });
  const context = requireScriptBot(request);
  return mutation ? { ...context, ...botRequestMetadata(request.headers) } : context;
}

function publicOrigin() {
  const configured = process.env.SCRIPT_PUBLIC_ORIGIN || 'https://www.bglarp.com';
  const url = new URL(configured);
  if (url.protocol !== 'https:' || url.username || url.password) throw unavailable('官網驗證網址設定不正確。');
  return url.origin;
}

function publicUrl(script) {
  // Production still reads Notion: its public route key is the name, not catalog slug.
  return `${publicOrigin()}/scripts/${encodeURIComponent(script.name)}`;
}

async function loadVersion(adminClient, id) {
  const { data, error } = await adminClient.from(SCRIPT_VERSION_TABLE)
    .select(SCRIPT_VERSION_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw databaseError('load bot draft version', error);
  if (!data) throw notFound();
  return data;
}

async function findReplay(adminClient, idempotencyKey) {
  const { data, error } = await adminClient.from(SCRIPT_VERSION_TABLE)
    .select(SCRIPT_VERSION_COLUMNS).eq('idempotency_key', idempotencyKey).maybeSingle();
  if (error) throw databaseError('load bot idempotency result', error);
  return data;
}

async function findCatalogByName(adminClient, name) {
  const { data: versions, error } = await adminClient.from(SCRIPT_VERSION_TABLE)
    .select('id,script_id').eq('content->>name', name).limit(201);
  if (error) throw databaseError('search bot catalog versions', error);
  const scriptIds = [...new Set((versions || []).map((version) => version.script_id))];
  if (!scriptIds.length) return [];
  if (versions.length > 200) throw conflict('同名歷史版本過多，請提供明確劇本 ID。');
  const currentVersionIds = new Set(versions.map((version) => version.id));
  const { data: rows, error: scriptError } = await adminClient.from(SCRIPT_TABLE)
    .select(SCRIPT_COLUMNS).in('id', scriptIds);
  if (scriptError) throw databaseError('search bot catalog scripts', scriptError);
  return Promise.all((rows || [])
    .filter((script) => currentVersionIds.has(script.draft_version_id) || currentVersionIds.has(script.published_version_id))
    .map((script) => getCatalogScript(adminClient, script.id)));
}

export async function searchBotScripts(adminClient, rawName) {
  const name = typeof rawName === 'string' ? rawName.trim() : '';
  if (!name || name.length > 120) throw invalidRequest('請提供要精確查詢的劇本名稱。');
  if (!process.env.NOTION_TOKEN || !process.env.DATABASE_ID) {
    throw unavailable('尚未完成 Notion 設定，無法安全核對是否重複上架。');
  }
  let publicScripts;
  try {
    publicScripts = await getAllScriptsFromNotion();
  } catch {
    throw unavailable('暫時無法核對 Notion 劇本清單；為避免重複上架，請稍後重試。');
  }
  const scripts = await findCatalogByName(adminClient, name);
  const publicMatches = publicScripts.filter((script) => script.name === name).map((script) => ({
    scriptId: script.scriptId,
    name: script.name,
    url: publicUrl(script),
    catalogId: scripts.find((item) => item.notionPageId === script.scriptId)?.id || null,
  }));
  return { scripts, publicMatches };
}

export async function createBotDraft(context, body) {
  const content = normalizeScriptContent(extractScriptContentInput(body));
  const slug = slugifyScriptName(content.name);
  if (body.slug && body.slug !== slug) throw invalidRequest('小六新劇本網址必須由劇本名稱產生，避免重複建立同名劇本。');
  const replay = await findReplay(context.adminClient, context.idempotencyKey);
  if (!replay) {
    const matches = await searchBotScripts(context.adminClient, content.name);
    if ((matches.scripts.length || matches.publicMatches.length)
      && !await findReplay(context.adminClient, context.idempotencyKey)) {
      throw conflict(matches.publicMatches.some((script) => !script.catalogId)
        ? '官網已有同名劇本，需先由後台精確匯入既有資料；沒有建立重複劇本。'
        : '已有同名劇本，請讀取明確劇本 ID 與目前版本後再修改；沒有建立重複劇本。');
    }
  }
  const input = {
    content,
    // An automatically suffixed name would hide duplicate submissions.
    slug,
  };
  let result;
  try {
    result = await createDraftScript(context.adminClient, context.actor, input, { idempotencyKey: context.idempotencyKey });
  } catch (error) {
    // The identical request can commit between the lookup and slug allocation.
    // Let the DB compare its immutable content instead of falsely reporting a duplicate.
    if (error?.code !== 'conflict' || !await findReplay(context.adminClient, context.idempotencyKey)) throw error;
    result = await createDraftScript(context.adminClient, context.actor, input, { idempotencyKey: context.idempotencyKey });
  }
  const operation = await findReplay(context.adminClient, context.idempotencyKey);
  return { ...result, operationVersionId: operation.id };
}

export async function patchBotDraft(context, scriptId, body) {
  const script = await getCatalogScript(context.adminClient, scriptId);
  if (body.slug && body.slug !== script.slug) throw invalidRequest('小六更新不能變更既有劇本網址代號。');
  const replay = await findReplay(context.adminClient, context.idempotencyKey);
  if (!replay) {
    requireBotExpectedVersion(script, body.expectedVersionId);
    requireBotDraftOwnership(script, await loadVersion(context.adminClient, script.draftVersionId), context.requestId);
  } else {
    if (replay.script_id !== scriptId) throw conflict('同一操作編號已用於另一筆劇本。');
    // Reconstruct against the version the original PATCH read, not a later draft.
    requireUuid(body.expectedVersionId, 'expectedVersionId');
  }
  const patch = extractScriptContentInput(body);
  if (replay) {
    const base = await loadVersion(context.adminClient, body.expectedVersionId);
    if (base.script_id !== scriptId) throw conflict('預期版本不屬於這筆劇本。');
    const intended = mergeScriptContent(base.content, patch);
    if (!isDeepStrictEqual(intended, normalizeScriptContent(replay.content))) {
      throw conflict('同一操作編號已用於不同內容，請沿用原始內容重試。');
    }
    return { script, operationVersionId: replay.id, idempotentReplay: true };
  }
  if (patch.name && patch.name.trim() !== script.name) {
    throw invalidRequest('小六目前不變更既有劇本名稱，請在後台明確處理改名。');
  }
  const result = await updateDraftScript(context.adminClient, context.actor, scriptId, {
    content: patch, expectedVersionId: body.expectedVersionId,
    // Bot edits never silently change the public catalog identifier.
  }, { idempotencyKey: context.idempotencyKey });
  const operation = await findReplay(context.adminClient, context.idempotencyKey);
  return { ...result, operationVersionId: operation.id };
}

function storageConfiguration(adminClient) {
  const bucket = process.env.SCRIPT_COVERS_BUCKET || DEFAULT_COVER_BUCKET;
  const storage = adminClient.storage.from(bucket);
  const { data } = storage.getPublicUrl('');
  return { bucket, storage, publicBase: data.publicUrl.replace(/\/$/, '') + '/' };
}

async function readAndCheckStoredImage(storage, path, { size, sha256, contentType } = {}) {
  const { data, error } = await storage.download(path);
  if (error || !data) throw invalidRequest('圖片還沒有完整上傳，請重新上傳原檔後再發布。');
  if (data.size < 1 || data.size > DEFAULT_COVER_MAX_BYTES || (size && data.size !== size)) {
    throw invalidRequest('儲存圖片大小與原檔不一致，請重新上傳。');
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const detectedType = contentType || ({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' })[path.split('.').pop()];
  if (!imageBytesMatchType(bytes, detectedType)) throw invalidRequest('圖片內容與格式不一致，請使用有效的 JPG、PNG 或 WebP。');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const expectedHash = sha256 || path.match(/\/([0-9a-f]{64})\.(?:jpg|png|webp)$/)?.[1];
  if (expectedHash && digest !== expectedHash) throw invalidRequest('圖片完整性檢查失敗，請重新傳送原檔。');
}

export async function createBotMediaUpload(context, body) {
  const input = normalizeBotMediaInput(body, DEFAULT_COVER_MAX_BYTES);
  const { bucket, storage } = storageConfiguration(context.adminClient);
  const path = botMediaPath(context.requestId, input);
  const folder = path.slice(0, path.lastIndexOf('/'));
  const filename = path.slice(path.lastIndexOf('/') + 1);
  const { data: objects, error: listError } = await storage.list(folder, { limit: 2, search: filename });
  if (listError) throw databaseError('find bot image upload', listError);
  const alreadyUploaded = (objects || []).some((object) => object.name === filename);
  const { data: publicData } = storage.getPublicUrl(path);
  let grant = {};
  if (alreadyUploaded) {
    await readAndCheckStoredImage(storage, path, input);
  } else {
    const { data, error } = await storage.createSignedUploadUrl(path, { upsert: false });
    if (error) throw databaseError('create bot image upload grant', error);
    grant = { token: data.token, signedUrl: data.signedUrl };
  }
  return { bucket, path, publicUrl: publicData.publicUrl, ...grant, contentType: input.contentType,
    maxBytes: DEFAULT_COVER_MAX_BYTES, sha256: input.sha256, alreadyUploaded };
}

async function validateBotAssets(context, script) {
  const { storage, publicBase } = storageConfiguration(context.adminClient);
  const oldVersion = script.publishedVersionId ? await loadVersion(context.adminClient, script.publishedVersionId) : null;
  const oldCover = oldVersion?.content?.cover;
  const assets = [{ asset: script.cover }, ...script.characters
    .filter((character) => character.image).map((character) => ({ asset: character.image, character }))];
  const inspectedPaths = new Set();
  for (const { asset, character } of assets) {
    if (!asset?.url) continue; // Publish validation reports missing required fields.
    if (asset === script.cover && oldCover?.url === asset.url && oldCover?.path === asset.path
      && !asset.url.startsWith(publicBase)) continue; // Preserve an unchanged legacy published cover.
    if (character && !asset.url.startsWith(publicBase)
      && (oldVersion?.content?.characters || []).some((previous) => sameCharacterMedia(previous, character))) continue;
    if (!asset.path || !/^[A-Za-z0-9/_\-.]+$/.test(asset.path) || asset.path.includes('..')
      || asset.url !== publicBase + asset.path) {
      throw invalidRequest('新增圖片必須先使用小六圖片通道上傳，不能使用其他網站或私人儲存位置。');
    }
    if (!inspectedPaths.has(asset.path)) {
      await readAndCheckStoredImage(storage, asset.path);
      inspectedPaths.add(asset.path);
    }
  }
}

export async function verifyBotPublication(script) {
  const url = publicUrl(script);
  if (script.status !== 'published') return { state: 'draft', verified: false, url: null };
  if (script.syncStatus !== 'synced') {
    return { state: 'sync_pending', verified: false, url, retryable: true };
  }
  try {
    const nonce = `${script.id}-${script.publishedVersionId}`;
    const [catalogResponse, detailResponse] = await Promise.all([
      fetch(`${publicOrigin()}/api/scripts?bot_verify=${encodeURIComponent(nonce)}`, {
        cache: 'no-store', signal: AbortSignal.timeout(15000),
      }),
      fetch(`${url}?bot_verify=${encodeURIComponent(nonce)}`, {
        cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'follow',
      }),
    ]);
    if (!catalogResponse.ok || !detailResponse.ok) throw new Error('public readback unavailable');
    if (new URL(detailResponse.url).origin !== publicOrigin()) throw new Error('unexpected public origin');
    const [catalog, html] = await Promise.all([catalogResponse.json(), detailResponse.text()]);
    const publicScript = Array.isArray(catalog) ? catalog.find((item) => item.scriptId === script.notionPageId) : null;
    const imageUrls = [script.cover?.url, ...script.characters.map((character) => character.image?.url)].filter(Boolean);
    const htmlContains = (value) => html.includes(value) || html.includes(value.replaceAll('&', '&amp;'));
    if (!publishedCatalogMatches(script, publicScript)
      || !html.includes(`data-bgl-script-fingerprint="${publicScriptFingerprint(publicScript)}"`)
      || !htmlContains(script.name)
      || !imageUrls.every(htmlContains)) throw new Error('public readback not converged');
    // A service-role download cannot prove that a visitor can actually see an image.
    const storageBase = getCharacterImageStorageBase();
    const publicImages = [...new Set(imageUrls.filter((imageUrl) => storageBase && imageUrl.startsWith(storageBase)))];
    const mediaResponses = await Promise.all(publicImages.map((imageUrl) => fetch(imageUrl, {
      method: 'HEAD', cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10000),
    })));
    if (mediaResponses.some((response) => response.status !== 200
      || !/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(response.headers.get('content-type') || ''))) {
      throw new Error('public image unavailable');
    }
    return { state: 'live', verified: true, url, verifiedAt: new Date().toISOString() };
  } catch {
    return { state: 'verification_pending', verified: false, url, retryable: true };
  }
}

export async function publishBotScript(context, scriptId, body, { retry = false } = {}) {
  const current = await getCatalogScript(context.adminClient, scriptId);
  requireBotExpectedVersion(current, body.expectedVersionId);
  requireBotDraftOwnership(current, await loadVersion(context.adminClient, current.draftVersionId), context.requestId);
  let result;
  if (retry) {
    if (current.publishedVersionId !== body.expectedVersionId) throw conflict('這個版本尚未發布，請先發布指定草稿。');
    result = current.syncStatus === 'synced'
      ? { script: current } : await retryCatalogScriptSync(context.adminClient, scriptId);
  } else {
    validateBotPublishContent(current);
    await validateBotAssets(context, current);
    result = await publishCatalogScript(context.adminClient, context.actor, scriptId, body.expectedVersionId);
  }
  if (result.script.publishedVersionId !== body.expectedVersionId || result.script.draftVersionId !== body.expectedVersionId) {
    throw conflict('發布過程中出現更新版本，請讀取狀態後再處理。');
  }
  revalidatePublishedScript(result.script);
  const publication = await verifyBotPublication(result.script);
  return { ...result, publication };
}

export async function getBotScript(context, scriptId) {
  const script = await getCatalogScript(context.adminClient, scriptId);
  const publication = script.draftVersionId === script.publishedVersionId
    ? await verifyBotPublication(script) : { state: 'draft', verified: false, url: null };
  return { script, publication };
}

export async function getBotJob(adminClient, rawKey) {
  const key = validateBotJobKey(rawKey);
  const { data, error } = await adminClient.from('catalog_bot_jobs')
    .select('state,revision,updated_at').eq('id', key).maybeSingle();
  if (error) throw databaseError('load bot conversation state', error);
  return { state: data?.state ?? null, revision: data?.revision ?? 0, updatedAt: data?.updated_at || null };
}

export async function saveBotJob(adminClient, rawKey, body) {
  const key = validateBotJobKey(rawKey);
  validateBotJobState(body.state, body.expectedRevision);
  const { data, error } = await adminClient.rpc('save_catalog_bot_job', {
    p_id: key, p_state: body.state, p_expected_revision: body.expectedRevision,
  });
  if (error?.code === '40001') throw conflict('案件剛被其他訊息更新，請重新讀取後合併；原資料已保留。');
  if (error) throw databaseError('save bot conversation state', error);
  return { state: data.state, revision: data.revision, updatedAt: data.updated_at };
}

export async function readBotJson(request, { job = false } = {}) {
  if (!job) return readAdminJson(request);
  const maxBytes = 512 * 1024;
  if (Number(request.headers.get('content-length')) > maxBytes) throw invalidRequest('案件資料不得超過 512 KiB。');
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw invalidRequest('案件資料不得超過 512 KiB。');
  let body;
  try { body = JSON.parse(raw); } catch { throw invalidRequest('無法讀取 JSON 案件資料。'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw invalidRequest('案件請求必須是 JSON 物件。');
  return body;
}
