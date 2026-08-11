import { randomUUID } from 'node:crypto';
import {
  SCRIPT_COLUMNS,
  SCRIPT_STATUSES,
  SCRIPT_SYNC_JOB_COLUMNS,
  SCRIPT_SYNC_JOB_TABLE,
  SCRIPT_TABLE,
  SCRIPT_VERSION_COLUMNS,
  SCRIPT_VERSION_TABLE,
} from './constants';
import {
  conflict,
  databaseError,
  forbidden,
  invalidRequest,
  notFound,
} from './errors';
import { ensureForumScript } from './forum';
import { findLatestNotionJob, processNotionSyncJob } from './notion';
import {
  mergeScriptContent,
  normalizeScriptContent,
  slugifyScriptName,
  validatePublishableContent,
} from './validation';

function mapSyncStatus(job) {
  if (!job) return 'not_synced';
  return {
    succeeded: 'synced',
    pending: 'pending',
    processing: 'syncing',
    failed: 'error',
    dead_letter: 'error',
  }[job.status] || 'not_synced';
}

function emptyContent() {
  return {
    name: '',
    synopsis: '',
    playerMin: null,
    playerMax: null,
    durationMinutes: null,
    durationLabel: '',
    priceStatus: 'tbd',
    price: null,
    genres: [],
    customTags: [],
    characters: [],
    cover: { url: '', path: '', alt: '', focalX: null, focalY: null },
    sortOrder: 0,
  };
}

export function serializeScript(script, draftVersion, publishedVersion, syncJob) {
  const content = draftVersion?.content || publishedVersion?.content || emptyContent();
  return {
    ...content,
    id: script.id,
    slug: script.slug,
    status: script.status,
    notionPageId: script.notion_page_id || null,
    publishedAt: script.published_at || null,
    updatedAt: script.updated_at,
    draftVersion: draftVersion?.version_no ?? null,
    draftVersionId: script.draft_version_id || null,
    publishedVersion: publishedVersion?.version_no ?? null,
    publishedVersionId: script.published_version_id || null,
    syncStatus: mapSyncStatus(syncJob),
  };
}

async function getVersionsByIds(adminClient, versionIds) {
  const ids = [...new Set(versionIds.filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await adminClient
    .from(SCRIPT_VERSION_TABLE)
    .select(SCRIPT_VERSION_COLUMNS)
    .in('id', ids);
  if (error) throw databaseError('load catalog versions', error);
  return new Map((data || []).map((version) => [version.id, version]));
}

function expectedNotionAction(script) {
  if (script.status === 'published') return 'upsert';
  if (script.status === 'unpublished') return 'unpublish';
  return null;
}

async function getLatestJobsByScript(adminClient, scripts) {
  if (!scripts.length) return new Map();
  const scriptsById = new Map(scripts.map((script) => [script.id, script]));
  const { data, error } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .in('script_id', scripts.map(({ id }) => id))
    .eq('target', 'notion')
    .order('updated_at', { ascending: false })
    .limit(Math.min(1000, Math.max(100, scripts.length * 10)));
  if (error) throw databaseError('load catalog sync jobs', error);
  const jobs = new Map();
  (data || []).forEach((job) => {
    const script = scriptsById.get(job.script_id);
    if (
      script
      && !jobs.has(job.script_id)
      && job.action === expectedNotionAction(script)
      && job.version_id === script.published_version_id
    ) {
      jobs.set(job.script_id, job);
    }
  });
  return jobs;
}

async function loadRawScript(adminClient, scriptId) {
  const { data, error } = await adminClient
    .from(SCRIPT_TABLE)
    .select(SCRIPT_COLUMNS)
    .eq('id', scriptId)
    .maybeSingle();
  if (error) throw databaseError('load catalog script', error);
  if (!data) throw notFound();
  return data;
}

export async function getCatalogScript(adminClient, scriptId) {
  const script = await loadRawScript(adminClient, scriptId);
  const versions = await getVersionsByIds(adminClient, [script.draft_version_id, script.published_version_id]);
  const jobs = await getLatestJobsByScript(adminClient, [script]);
  return serializeScript(
    script,
    versions.get(script.draft_version_id),
    versions.get(script.published_version_id),
    jobs.get(script.id),
  );
}

export async function listCatalogScripts(adminClient, options = {}) {
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const offset = Math.max(0, options.offset || 0);
  let query = adminClient
    .from(SCRIPT_TABLE)
    .select(SCRIPT_COLUMNS, { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (options.status) {
    if (!SCRIPT_STATUSES.includes(options.status)) {
      throw invalidRequest('不支援的劇本狀態。');
    }
    query = query.eq('status', options.status);
  }

  const { data: scripts, error, count } = await query;
  if (error) throw databaseError('list catalog scripts', error);
  const rows = scripts || [];
  const versions = await getVersionsByIds(
    adminClient,
    rows.flatMap((script) => [script.draft_version_id, script.published_version_id]),
  );
  const jobs = await getLatestJobsByScript(adminClient, rows);
  return {
    scripts: rows.map((script) => serializeScript(
      script,
      versions.get(script.draft_version_id),
      versions.get(script.published_version_id),
      jobs.get(script.id),
    )),
    pagination: { limit, offset, total: count || 0 },
  };
}

async function allocateSlug(adminClient, requested, exceptId = null) {
  const base = slugifyScriptName(requested);
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    let query = adminClient.from(SCRIPT_TABLE).select('id').eq('slug', candidate);
    if (exceptId) query = query.neq('id', exceptId);
    const { data, error } = await query.maybeSingle();
    if (error) throw databaseError('check catalog slug', error);
    if (!data) return candidate;
  }
  throw conflict('無法產生唯一的網址代號，請另外指定 slug。');
}

async function findIdempotentVersion(adminClient, key) {
  if (!key) return null;
  const { data, error } = await adminClient
    .from(SCRIPT_VERSION_TABLE)
    .select(SCRIPT_VERSION_COLUMNS)
    .eq('idempotency_key', key)
    .maybeSingle();
  if (error) throw databaseError('load idempotent version', error);
  return data;
}

function draftRpcError(error) {
  if (error?.code === '40001') return conflict();
  if (error?.code === '23505') {
    return conflict('Idempotency-Key 已用於不同資料，或網址代號已存在。');
  }
  if (error?.code === 'P0002') return notFound();
  if (error?.code === '42501') return forbidden();
  if (error?.code === '22023' || error?.code === '23503') {
    return invalidRequest('草稿資料無法儲存，請重新整理後再試。');
  }
  return databaseError('save catalog draft', error);
}

function publicationRpcError(operation, error) {
  if (error?.code === 'P0002') return notFound();
  if (error?.code === '42501') return forbidden();
  if (error?.code === '40001') return conflict();
  if (error?.code === '22023' || error?.code === '23503') {
    return invalidRequest('這筆劇本目前無法完成狀態變更，請重新整理後再試。');
  }
  return databaseError(operation, error);
}

async function saveDraftRpc(adminClient, actor, payload) {
  const { data, error } = await adminClient.rpc('save_catalog_script_draft', {
    p_script_id: payload.scriptId,
    p_slug: payload.slug,
    p_content: payload.content,
    p_actor_id: actor.id,
    p_actor_type: actor.type,
    p_expected_version_number: payload.expectedVersionNumber,
    p_idempotency_key: payload.idempotencyKey,
  });
  if (error) throw draftRpcError(error);
  if (!data?.script_id) throw databaseError('save catalog draft result', { code: 'missing_result' });
  return data;
}

export async function createDraftScript(adminClient, actor, input, options = {}) {
  const content = normalizeScriptContent(input.content);
  const idempotencyKey = options.idempotencyKey || `human:${randomUUID()}`;
  const existingVersion = await findIdempotentVersion(adminClient, idempotencyKey);
  const requestedSlug = input.slug || content.name;
  let slug;
  if (existingVersion) {
    const existingScript = await loadRawScript(adminClient, existingVersion.script_id);
    if (input.slug && slugifyScriptName(input.slug) !== existingScript.slug) {
      throw conflict('Idempotency-Key 已用於不同的網址代號。');
    }
    slug = existingScript.slug;
  } else {
    slug = await allocateSlug(adminClient, requestedSlug);
    if (input.slug && slug !== slugifyScriptName(input.slug)) {
      throw conflict('這個網址代號已被使用，請更換後再試。');
    }
  }

  const version = await saveDraftRpc(adminClient, actor, {
    scriptId: null,
    slug,
    content,
    expectedVersionNumber: 0,
    idempotencyKey,
  });
  return {
    script: await getCatalogScript(adminClient, version.script_id),
    idempotentReplay: Boolean(existingVersion),
  };
}

export async function updateDraftScript(adminClient, actor, scriptId, input, options = {}) {
  const idempotencyKey = options.idempotencyKey || `human:${randomUUID()}`;
  const replay = await findIdempotentVersion(adminClient, idempotencyKey);
  if (replay && replay.script_id !== scriptId) {
    throw conflict('Idempotency-Key 已用於另一筆劇本資料。');
  }

  const script = await loadRawScript(adminClient, scriptId);
  if (!replay && input.expectedVersionId && script.draft_version_id !== input.expectedVersionId) {
    throw conflict();
  }
  const versions = await getVersionsByIds(adminClient, [script.draft_version_id, script.published_version_id]);
  const baseVersion = versions.get(script.draft_version_id) || versions.get(script.published_version_id);
  if (!baseVersion) throw conflict('這筆劇本目前沒有可編輯的版本。');
  if (
    !replay
    && input.expectedVersionNumber !== undefined
    && input.expectedVersionNumber !== null
    && input.expectedVersionNumber !== baseVersion.version_no
  ) {
    throw conflict();
  }
  if (!input.content || typeof input.content !== 'object') {
    throw invalidRequest('請提供要更新的 content。');
  }
  const content = mergeScriptContent(baseVersion.content, input.content);
  const slug = input.slug
    ? await allocateSlug(adminClient, input.slug, script.id)
    : script.slug;
  const version = await saveDraftRpc(adminClient, actor, {
    scriptId: script.id,
    slug,
    content,
    expectedVersionNumber: input.expectedVersionNumber ?? baseVersion.version_no,
    idempotencyKey,
  });
  return {
    script: await getCatalogScript(adminClient, version.script_id),
    idempotentReplay: Boolean(replay),
  };
}

async function attemptRpcNotionJob(adminClient, scriptId, versionId, action) {
  const job = await findLatestNotionJob(
    adminClient,
    scriptId,
    versionId,
    action,
    ['pending', 'failed'],
  );
  if (!job) return null;
  return processNotionSyncJob(adminClient, job.id);
}

export async function retryCatalogScriptSync(adminClient, scriptId) {
  const script = await loadRawScript(adminClient, scriptId);
  const action = expectedNotionAction(script);
  if (!action || !script.published_version_id) {
    throw conflict('這筆劇本目前沒有可重試的 Notion 同步工作。');
  }
  const { data: job, error } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .eq('script_id', scriptId)
    .eq('version_id', script.published_version_id)
    .eq('target', 'notion')
    .eq('action', action)
    .in('status', ['pending', 'failed', 'processing'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw databaseError('load retryable notion job', error);
  if (!job) throw conflict('這筆劇本目前沒有可重試的 Notion 同步工作。');
  await processNotionSyncJob(adminClient, job.id, { force: job.status !== 'processing' });
  return { script: await getCatalogScript(adminClient, scriptId) };
}

export async function publishCatalogScript(
  adminClient,
  actor,
  scriptId,
  requestedVersionId = null,
  expectedVersionNumber = null,
) {
  const script = await loadRawScript(adminClient, scriptId);
  const versionId = requestedVersionId || script.draft_version_id;
  if (!versionId) throw conflict('這筆劇本沒有可發布的草稿。');
  const versions = await getVersionsByIds(adminClient, [versionId]);
  const version = versions.get(versionId);
  if (!version || version.script_id !== script.id) throw conflict('指定的草稿不屬於這筆劇本。');
  if (expectedVersionNumber !== null && version.version_no !== expectedVersionNumber) {
    throw conflict();
  }
  validatePublishableContent(version.content);

  const { error } = await adminClient.rpc('publish_catalog_script', {
    p_script_id: script.id,
    p_version_id: version.id,
    p_actor_id: actor.id,
    p_actor_type: actor.type,
  });
  if (error) throw publicationRpcError('publish catalog script', error);

  const published = await loadRawScript(adminClient, script.id);
  try {
    await ensureForumScript(adminClient, published, version, true);
  } catch {
    // The authoritative publish RPC has already committed. The outbox handler
    // retries this forum projection and records a sync error if it still fails.
  }
  await attemptRpcNotionJob(adminClient, script.id, version.id, 'upsert');
  return { script: await getCatalogScript(adminClient, script.id) };
}

export async function unpublishCatalogScript(
  adminClient,
  actor,
  scriptId,
  reason = null,
  expectedPublishedVersionNumber = null,
) {
  const script = await loadRawScript(adminClient, scriptId);
  if (!script.published_version_id) throw conflict('這筆劇本尚未發布。');
  const versions = await getVersionsByIds(adminClient, [script.published_version_id]);
  const version = versions.get(script.published_version_id);
  if (!version) throw conflict('找不到目前的正式版本。');
  if (
    expectedPublishedVersionNumber !== null
    && version.version_no !== expectedPublishedVersionNumber
  ) {
    throw conflict();
  }

  const { error } = await adminClient.rpc('unpublish_catalog_script', {
    p_script_id: script.id,
    p_actor_id: actor.id,
    p_actor_type: actor.type,
    p_reason: reason || null,
    p_expected_published_version_no: expectedPublishedVersionNumber,
  });
  if (error) throw publicationRpcError('unpublish catalog script', error);

  const unpublished = await loadRawScript(adminClient, script.id);
  try {
    await ensureForumScript(adminClient, unpublished, version, false);
  } catch {
    // The authoritative unpublish RPC has already committed; synchronization
    // remains retryable and must not turn the real state change into HTTP 500.
  }
  await attemptRpcNotionJob(adminClient, script.id, version.id, 'unpublish');
  return { script: await getCatalogScript(adminClient, script.id) };
}
