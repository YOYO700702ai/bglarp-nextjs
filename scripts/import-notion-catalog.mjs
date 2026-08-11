#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const NOTION_VERSION = '2022-06-28';
const NOTION_PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 30_000;
const DEMOTE_TO_BOTTOM = new Set(['血色牌局', '安生', '灰鼠之冬']);
const REQUIRED_ENV = [
  'NOTION_TOKEN',
  'DATABASE_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const NOTION_PROPERTY_ENV = {
  title: ['SCRIPT_NOTION_TITLE_PROPERTY', '劇本名稱'],
  synopsis: ['SCRIPT_NOTION_SYNOPSIS_PROPERTY', '劇情簡介'],
  characters: ['SCRIPT_NOTION_CHARACTERS_PROPERTY', '角色'],
  genres: ['SCRIPT_NOTION_GENRES_PROPERTY', '類型'],
  customTags: ['SCRIPT_NOTION_CUSTOM_TAGS_PROPERTY', '類型標籤'],
  duration: ['SCRIPT_NOTION_DURATION_PROPERTY', '時長'],
  price: ['SCRIPT_NOTION_PRICE_PROPERTY', '價格'],
  players: ['SCRIPT_NOTION_PLAYERS_PROPERTY', '人數'],
};

function printHelp() {
  console.log(`
BGLARP Notion → Supabase 一次性劇本匯入工具

用法：
  node scripts/import-notion-catalog.mjs              # dry-run，不寫入
  node scripts/import-notion-catalog.mjs --limit=5    # 只預演前 5 筆
  node scripts/import-notion-catalog.mjs --apply      # 確認寫入
  node scripts/import-notion-catalog.mjs --apply --limit=5

必要環境變數：
  ${REQUIRED_ENV.join('\n  ')}

安全規則：預設只讀；只有明確加上 --apply 才會寫入 Supabase。
`);
}

function parseArguments(argv) {
  const options = { apply: false, limit: null, help: false };
  for (const argument of argv) {
    if (argument === '--apply') {
      options.apply = true;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument.startsWith('--limit=')) {
      const raw = argument.slice('--limit='.length);
      if (!/^\d+$/.test(raw) || Number(raw) < 1) {
        throw new Error('--limit 必須是大於 0 的整數。');
      }
      options.limit = Number(raw);
      continue;
    }
    throw new Error(`不支援的參數：${argument}`);
  }
  return options;
}

function readEnvironment() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`缺少必要環境變數：${missing.join(', ')}`);
  }
  return {
    ...Object.fromEntries(REQUIRED_ENV.map((name) => [name, process.env[name]])),
    notionProperties: Object.fromEntries(
      Object.entries(NOTION_PROPERTY_ENV).map(([key, [environmentName, fallback]]) => [
        key,
        process.env[environmentName]?.trim() || fallback,
      ]),
    ),
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function notionQuery({ token, databaseId, startCursor = null }) {
  const body = { page_size: NOTION_PAGE_SIZE };
  if (startCursor) body.start_cursor = startCursor;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let response;
    try {
      response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Notion-Version': NOTION_VERSION,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      if (attempt === 4) {
        throw new Error(`Notion 連線失敗：${error?.name === 'TimeoutError' ? '逾時' : '網路錯誤'}`);
      }
      await wait(Math.min(10_000, 500 * (2 ** attempt)));
      continue;
    }

    if (response.ok) {
      const payload = await response.json();
      if (!Array.isArray(payload.results)) throw new Error('Notion 回傳格式不正確。');
      return payload;
    }

    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const retryAfterSeconds = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfterSeconds)
        ? Math.min(30_000, Math.max(500, retryAfterSeconds * 1000))
        : Math.min(10_000, 500 * (2 ** attempt));
      await wait(delay);
      continue;
    }

    throw new Error(`Notion 查詢失敗（HTTP ${response.status}）。`);
  }

  throw new Error('Notion 查詢重試次數已用盡。');
}

async function fetchAllNotionPages(environment) {
  const pages = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const payload = await notionQuery({
      token: environment.NOTION_TOKEN,
      databaseId: environment.DATABASE_ID,
      startCursor: cursor,
    });
    pages.push(...payload.results);
    hasMore = payload.has_more === true;
    cursor = payload.next_cursor || null;
    if (hasMore && !cursor) throw new Error('Notion 分頁缺少 next_cursor，已停止以避免不完整匯入。');
  }

  return pages;
}

function plainText(items) {
  return Array.isArray(items)
    ? items.map((item) => item?.plain_text || item?.text?.content || '').join('').trim()
    : '';
}

function textProperty(property) {
  if (!property || typeof property !== 'object') return '';
  if (property.type === 'title' || Array.isArray(property.title)) return plainText(property.title);
  if (property.type === 'rich_text' || Array.isArray(property.rich_text)) return plainText(property.rich_text);
  if (property.type === 'select') return String(property.select?.name || '').trim();
  if (property.type === 'formula') {
    if (property.formula?.type === 'string') return String(property.formula.string || '').trim();
    if (property.formula?.type === 'number' && Number.isFinite(property.formula.number)) {
      return String(property.formula.number);
    }
  }
  return '';
}

function optionNames(property) {
  if (!property || typeof property !== 'object') return [];
  if (Array.isArray(property.multi_select)) {
    return property.multi_select.map((option) => String(option?.name || '').trim()).filter(Boolean);
  }
  if (property.select?.name) return [String(property.select.name).trim()].filter(Boolean);
  const text = textProperty(property);
  return text ? [text] : [];
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function splitTags(values) {
  return uniqueStrings(values.flatMap((value) => String(value || '')
    .split(/[,/、。·\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)));
}

function parseCharacterLine(line) {
  const normalized = String(line || '').trim();
  if (!normalized) return null;
  const colon = normalized.match(/^([^：:]+)[：:]\s*(.*)$/);
  if (colon) return { name: colon[1].trim(), description: colon[2].trim() };
  const dash = normalized.match(/^(.+?)\s+(?:－|–|—|-)\s+(.*)$/);
  if (dash) return { name: dash[1].trim(), description: dash[2].trim() };
  return { name: normalized, description: '' };
}

function parseCharacters(property) {
  const optionLines = optionNames(property);
  const lines = property?.type === 'multi_select' || Array.isArray(property?.multi_select)
    ? optionLines
    : textProperty(property).split(/\r?\n/);
  return lines.map(parseCharacterLine).filter((character) => character?.name);
}

function parsePlayerRange(property) {
  const labels = optionNames(property).flatMap((value) => String(value).split(/[,、/]/));
  const counts = [];

  for (const label of labels) {
    const genderCounts = Array.from(label.matchAll(/(\d+)\s*(?:男|女)/g)).map((match) => Number(match[1]));
    if (genderCounts.length >= 2) {
      counts.push(genderCounts.reduce((sum, count) => sum + count, 0));
      continue;
    }
    const numbers = Array.from(label.matchAll(/\d+/g)).map((match) => Number(match[0]));
    counts.push(...numbers);
  }

  const valid = counts.filter((value) => Number.isInteger(value) && value > 0 && value <= 30);
  return valid.length
    ? { playerMin: Math.min(...valid), playerMax: Math.max(...valid) }
    : { playerMin: null, playerMax: null };
}

function parseDuration(property) {
  if (typeof property?.number === 'number' && Number.isFinite(property.number) && property.number > 0) {
    return {
      durationMinutes: Math.round(property.number),
      durationLabel: `${Math.round(property.number)} 分鐘`,
    };
  }

  const label = textProperty(property).trim();
  if (!label) return { durationMinutes: null, durationLabel: '' };

  // Ranges keep their original human-readable label; a single exact value can
  // also populate durationMinutes for filtering and future UI calculations.
  const isRange = /(?:~|～|至|到|—|–|-)/.test(label);
  if (!isRange) {
    const hourMatch = label.match(/(\d+(?:\.\d+)?)\s*(?:小時|時|hours?|hrs?|hr|h)/i);
    if (hourMatch) {
      return { durationMinutes: Math.round(Number(hourMatch[1]) * 60), durationLabel: label };
    }
    const minuteMatch = label.match(/(\d+)\s*(?:分鐘|分|minutes?|mins?|min)/i);
    if (minuteMatch) {
      return { durationMinutes: Number(minuteMatch[1]), durationLabel: label };
    }
  }

  return { durationMinutes: null, durationLabel: label };
}

function parsePrice(property) {
  if (typeof property?.number === 'number' && Number.isFinite(property.number)) {
    return property.number === 0
      ? { priceStatus: 'free', price: 0 }
      : { priceStatus: 'fixed', price: property.number };
  }

  const text = textProperty(property);
  if (/免費|free/i.test(text)) return { priceStatus: 'free', price: 0 };
  if (/待定|未定|另議|tbd/i.test(text) || !text) return { priceStatus: 'tbd', price: null };
  const numeric = Number(text.replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) && numeric >= 0
    ? (numeric === 0 ? { priceStatus: 'free', price: 0 } : { priceStatus: 'fixed', price: numeric })
    : { priceStatus: 'tbd', price: null };
}

function mapCover(page, name) {
  const cover = page?.cover;
  const alt = name ? `${name}劇本封面` : '劇本封面';
  if (cover?.type === 'external' && /^https:\/\//i.test(cover.external?.url || '')) {
    return {
      cover: { url: cover.external.url, path: '', alt, focalX: 50, focalY: 50 },
      blocker: null,
    };
  }
  if (cover?.type === 'file') {
    return {
      cover: { url: '', path: '', alt, focalX: 50, focalY: 50 },
      blocker: 'Notion file 封面是暫時網址，需重新上傳永久封面',
    };
  }
  return {
    cover: { url: '', path: '', alt, focalX: 50, focalY: 50 },
    blocker: '缺少可公開使用的封面',
  };
}

function notionName(page, propertyNames) {
  return textProperty(page?.properties?.[propertyNames.title]);
}

function mapNotionPage(page, sortOrder, propertyNames) {
  const properties = page?.properties || {};
  const rawName = notionName(page, propertyNames);
  const name = rawName || '未命名';
  const synopsis = textProperty(properties[propertyNames.synopsis]);
  const genres = splitTags(optionNames(properties[propertyNames.genres]));
  const customTags = splitTags(optionNames(properties[propertyNames.customTags]));
  const characters = parseCharacters(properties[propertyNames.characters]);
  const players = parsePlayerRange(properties[propertyNames.players]);
  const duration = parseDuration(properties[propertyNames.duration]);
  const price = parsePrice(properties[propertyNames.price]);
  const coverResult = mapCover(page, rawName);

  const content = {
    name,
    synopsis,
    playerMin: players.playerMin,
    playerMax: players.playerMax,
    durationMinutes: duration.durationMinutes,
    durationLabel: duration.durationLabel,
    priceStatus: price.priceStatus,
    price: price.price,
    genres,
    customTags,
    characters,
    cover: coverResult.cover,
    sortOrder,
  };

  const blockers = [];
  if (!rawName) blockers.push('缺少劇本名稱');
  if (!synopsis) blockers.push('缺少劇情簡介');
  if (players.playerMin === null || players.playerMax === null) blockers.push('無法解析人數範圍');
  if (duration.durationMinutes === null && !duration.durationLabel) blockers.push('缺少時長');
  if (price.priceStatus === 'fixed' && (!Number.isFinite(price.price) || price.price < 0)) blockers.push('固定價格格式不正確');
  if (coverResult.blocker) blockers.push(coverResult.blocker);

  return {
    page,
    displayName: rawName || '未命名劇本',
    content,
    blockers,
    idempotencyKey: `notion-import:${page.id}:${page.last_edited_time}`,
  };
}

function sortNotionPages(pages, propertyNames) {
  return [...pages].sort((left, right) => {
    const leftDemoted = DEMOTE_TO_BOTTOM.has(notionName(left, propertyNames));
    const rightDemoted = DEMOTE_TO_BOTTOM.has(notionName(right, propertyNames));
    if (leftDemoted !== rightDemoted) return leftDemoted ? 1 : -1;
    return new Date(right.created_time || 0) - new Date(left.created_time || 0);
  });
}

function slugify(value, pageId) {
  const source = String(value || '') === '未命名' ? `notion-${pageId}` : String(value || '');
  const raw = source
    .normalize('NFKC')
    .toLocaleLowerCase('zh-Hant')
    .replace(/[\u2018\u2019'`]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '');
  const limited = Array.from(raw).slice(0, 100).join('').replace(/-+$/g, '');
  if (!limited) return `notion-${String(pageId).replace(/-/g, '').slice(0, 20)}`;
  return limited;
}

function allocateSlug(base, usedSlugs) {
  for (let suffix = 1; suffix <= 1000; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    if (!usedSlugs.has(candidate)) {
      usedSlugs.add(candidate);
      return candidate;
    }
  }
  throw new Error(`無法為「${base}」產生唯一 slug。`);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function assertSupabase(result, operation) {
  if (result.error) {
    const error = new Error(`${operation}失敗：${result.error.message || result.error.code || '資料庫錯誤'}`);
    error.code = result.error.code;
    throw error;
  }
  return result.data;
}

async function selectInChunks(client, table, column, values, columns) {
  const unique = Array.from(new Set(values.filter(Boolean)));
  if (!unique.length) return [];
  const rows = [];
  for (let index = 0; index < unique.length; index += 50) {
    const result = await client
      .from(table)
      .select(columns)
      .in(column, unique.slice(index, index + 50));
    rows.push(...(assertSupabase(result, `讀取 ${table}`) || []));
  }
  return rows;
}

async function loadSupabaseState(client, items) {
  const [catalogsResult, forumsResult] = await Promise.all([
    client.from('catalog_scripts').select('id, slug, status, notion_page_id, forum_script_id, draft_version_id, published_version_id'),
    client.from('forum_scripts').select('id, notion_page_id, title, is_active'),
  ]);
  const catalogs = assertSupabase(catalogsResult, '讀取 catalog_scripts') || [];
  const forums = assertSupabase(forumsResult, '讀取 forum_scripts') || [];
  const keyedVersions = await selectInChunks(
    client,
    'catalog_script_versions',
    'idempotency_key',
    items.map((item) => item.idempotencyKey),
    'id, script_id, version_no, source, content, idempotency_key',
  );
  const draftVersions = await selectInChunks(
    client,
    'catalog_script_versions',
    'id',
    catalogs.map((catalog) => catalog.draft_version_id),
    'id, script_id, version_no, source, content, idempotency_key',
  );
  const versions = [...keyedVersions, ...draftVersions];

  return {
    catalogs,
    forums,
    catalogById: new Map(catalogs.map((row) => [row.id, row])),
    catalogByNotionId: new Map(catalogs.filter((row) => row.notion_page_id).map((row) => [row.notion_page_id, row])),
    forumByNotionId: new Map(forums.map((row) => [row.notion_page_id, row])),
    versionById: new Map(versions.map((row) => [row.id, row])),
    versionByKey: new Map(keyedVersions.map((row) => [row.idempotency_key, row])),
    usedSlugs: new Set(catalogs.map((row) => row.slug)),
  };
}

function resolveExisting(item, state) {
  const version = state.versionByKey.get(item.idempotencyKey) || null;
  const linkedCatalog = state.catalogByNotionId.get(item.page.id) || null;
  const versionCatalog = version ? state.catalogById.get(version.script_id) || null : null;
  if (linkedCatalog && versionCatalog && linkedCatalog.id !== versionCatalog.id) {
    throw new Error('同一個 Notion 頁面對應到不同 catalog script，已停止以避免覆蓋。');
  }
  return { version, catalog: linkedCatalog || versionCatalog };
}

function describePlan(item, state) {
  const { version, catalog } = resolveExisting(item, state);
  if (version && canonicalJson(version.content) !== canonicalJson(item.content)) {
    return { action: '衝突', reason: '同一 idempotency key 已存在，但映射內容不同', version, catalog };
  }
  if (version) {
    if (catalog?.draft_version_id && catalog.draft_version_id !== version.id) {
      return { action: '略過', reason: 'Supabase 已有較新的草稿版本', version, catalog };
    }
    return { action: '重用', reason: null, version, catalog };
  }

  const currentDraft = catalog?.draft_version_id ? state.versionById.get(catalog.draft_version_id) : null;
  if (currentDraft && currentDraft.source !== 'import') {
    return { action: '略過', reason: `現有草稿來源是 ${currentDraft.source}，不以匯入資料覆蓋`, version: null, catalog };
  }
  return { action: catalog ? '更新' : '新增', reason: null, version: null, catalog };
}

async function saveDraft(client, item, state, plan) {
  if (plan.version) return { version: plan.version, catalog: plan.catalog, reused: true };

  const catalog = plan.catalog;
  const currentDraft = catalog?.draft_version_id ? state.versionById.get(catalog.draft_version_id) : null;
  const slug = catalog?.slug || allocateSlug(slugify(item.content.name, item.page.id), state.usedSlugs);
  const result = await client.rpc('save_catalog_script_draft', {
    p_script_id: catalog?.id || null,
    p_slug: slug,
    p_content: item.content,
    p_actor_id: null,
    p_actor_type: 'import',
    p_expected_version_number: currentDraft?.version_no || 0,
    p_idempotency_key: item.idempotencyKey,
  });
  const version = assertSupabase(result, '儲存匯入草稿');
  if (!version?.id || !version?.script_id) throw new Error('save_catalog_script_draft 未回傳完整版本資料。');

  let nextCatalog = catalog;
  if (!nextCatalog) {
    nextCatalog = assertSupabase(
      await client
        .from('catalog_scripts')
        .select('id, slug, status, notion_page_id, forum_script_id, draft_version_id, published_version_id')
        .eq('id', version.script_id)
        .single(),
      '讀取新建 catalog script',
    );
  } else {
    nextCatalog = { ...nextCatalog, draft_version_id: version.id };
  }

  state.versionById.set(version.id, version);
  state.versionByKey.set(item.idempotencyKey, version);
  state.catalogById.set(nextCatalog.id, nextCatalog);
  return { version, catalog: nextCatalog, reused: false };
}

async function createInactiveForumIfNeeded(client, item, state) {
  let forum = state.forumByNotionId.get(item.page.id) || null;
  if (forum) return { forum, created: false };

  forum = assertSupabase(
    await client
      .from('forum_scripts')
      .upsert({
        notion_page_id: item.page.id,
        title: item.content.name,
        is_active: false,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'notion_page_id' })
      .select('id, notion_page_id, title, is_active')
      .single(),
    '建立 forum_scripts 關聯',
  );
  state.forumByNotionId.set(item.page.id, forum);
  return { forum, created: true };
}

async function linkCatalogSource(client, item, state, catalog, { createForum = false } = {}) {
  let forum = state.forumByNotionId.get(item.page.id) || null;
  let forumCreated = false;
  if (!forum && createForum) {
    const result = await createInactiveForumIfNeeded(client, item, state);
    forum = result.forum;
    forumCreated = result.created;
  }

  if (catalog.forum_script_id && forum && catalog.forum_script_id !== forum.id) {
    throw new Error('catalog_scripts 已連到不同 forum_scripts，已停止以保護既有劇本識別關聯。');
  }

  const patch = { notion_page_id: item.page.id };
  if (forum) patch.forum_script_id = forum.id;
  const updated = assertSupabase(
    await client
      .from('catalog_scripts')
      .update(patch)
      .eq('id', catalog.id)
      .select('id, slug, status, notion_page_id, forum_script_id, draft_version_id, published_version_id')
      .single(),
    '連結 Notion 與 forum_scripts',
  );

  state.catalogById.set(updated.id, updated);
  state.catalogByNotionId.set(item.page.id, updated);
  return { catalog: updated, forum, forumCreated };
}

async function closeImportOutbox(client, scriptId, versionId) {
  const key = `catalog:${scriptId}:${versionId}:notion:upsert`;
  const job = assertSupabase(
    await client
      .from('script_sync_jobs')
      .update({
        status: 'succeeded',
        attempts: 0,
        last_error: null,
        next_attempt_at: new Date().toISOString(),
      })
      .eq('idempotency_key', key)
      .eq('target', 'notion')
      .eq('action', 'upsert')
      .select('id')
      .maybeSingle(),
    '關閉匯入來源的 Notion outbox',
  );
  if (!job) throw new Error('找不到剛建立的 Notion upsert outbox；為避免回寫來源，已停止。');
}

async function activateForum(client, item, forum) {
  if (!forum) return null;
  return assertSupabase(
    await client
      .from('forum_scripts')
      .update({
        title: item.content.name,
        is_active: true,
        synced_at: new Date().toISOString(),
      })
      .eq('id', forum.id)
      .select('id, notion_page_id, title, is_active')
      .single(),
    '啟用 forum_scripts',
  );
}

function statusLine(index, item, status, detail = '') {
  const number = String(index + 1).padStart(3, '0');
  console.log(`[${status}] ${number} ${item.displayName}${detail ? ` — ${detail}` : ''}`);
}

function newStatistics(total) {
  return {
    total,
    publishable: 0,
    draftOnly: 0,
    plannedNew: 0,
    plannedUpdate: 0,
    reused: 0,
    saved: 0,
    published: 0,
    alreadyPublished: 0,
    skipped: 0,
    failed: 0,
    forumCreated: 0,
    outboxClosed: 0,
  };
}

function printSummary(statistics, apply) {
  console.log('\n匯入摘要');
  console.log(`  模式：${apply ? 'APPLY（已允許寫入）' : 'DRY-RUN（完全不寫入）'}`);
  console.log(`  本次處理：${statistics.total}`);
  console.log(`  資料完整：${statistics.publishable}`);
  console.log(`  僅能留草稿：${statistics.draftOnly}`);
  if (apply) {
    console.log(`  新增／更新草稿：${statistics.saved}`);
    console.log(`  重用既有版本：${statistics.reused}`);
    console.log(`  新發布：${statistics.published}`);
    console.log(`  原已發布：${statistics.alreadyPublished}`);
    console.log(`  新建劇本識別關聯：${statistics.forumCreated}`);
    console.log(`  已關閉來源 outbox：${statistics.outboxClosed}`);
  } else {
    console.log(`  預計新增：${statistics.plannedNew}`);
    console.log(`  預計更新：${statistics.plannedUpdate}`);
    console.log(`  已可重用：${statistics.reused}`);
  }
  console.log(`  安全略過：${statistics.skipped}`);
  console.log(`  失敗：${statistics.failed}`);
}

async function run() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const environment = readEnvironment();
  console.log(`模式：${options.apply ? 'APPLY（將寫入 Supabase）' : 'DRY-RUN（不會寫入）'}`);
  if (options.limit) console.log(`限制：只處理排序後前 ${options.limit} 筆`);
  console.log('正在讀取 Notion 劇本資料…');

  const allPages = sortNotionPages(
    await fetchAllNotionPages(environment),
    environment.notionProperties,
  );
  const selectedPages = options.limit ? allPages.slice(0, options.limit) : allPages;
  const items = selectedPages.map((page, index) => (
    mapNotionPage(page, index, environment.notionProperties)
  ));
  console.log(`Notion 共讀取 ${allPages.length} 筆，本次檢查 ${items.length} 筆。`);

  const client = createClient(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } },
  );
  const state = await loadSupabaseState(client, items);
  const statistics = newStatistics(items.length);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const complete = item.blockers.length === 0;
    if (complete) statistics.publishable += 1;
    else statistics.draftOnly += 1;

    try {
      const plan = describePlan(item, state);
      if (plan.action === '衝突' || plan.action === '略過') {
        statistics.skipped += 1;
        statusLine(index, item, plan.action, plan.reason);
        continue;
      }

      if (!options.apply) {
        if (plan.action === '新增') statistics.plannedNew += 1;
        else if (plan.action === '更新') statistics.plannedUpdate += 1;
        else if (plan.action === '重用') statistics.reused += 1;
        const readiness = complete ? '資料完整，可發布' : `僅草稿：${item.blockers.join('；')}`;
        statusLine(index, item, `DRY ${plan.action}`, readiness);
        continue;
      }

      const saved = await saveDraft(client, item, state, plan);
      if (saved.reused) statistics.reused += 1;
      else statistics.saved += 1;

      const linked = await linkCatalogSource(client, item, state, saved.catalog, { createForum: complete });
      if (linked.forumCreated) statistics.forumCreated += 1;

      if (!complete) {
        statusLine(index, item, saved.reused ? '草稿重用' : '草稿完成', item.blockers.join('；'));
        continue;
      }

      if (linked.catalog.draft_version_id !== saved.version.id) {
        statistics.skipped += 1;
        statusLine(index, item, '略過發布', 'Supabase 已有較新的草稿版本');
        continue;
      }

      const wasAlreadyPublished = linked.catalog.status === 'published'
        && linked.catalog.published_version_id === saved.version.id;
      if (!wasAlreadyPublished) {
        assertSupabase(
          await client.rpc('publish_catalog_script', {
            p_script_id: linked.catalog.id,
            p_version_id: saved.version.id,
            p_actor_id: null,
            p_actor_type: 'import',
          }),
          '發布匯入版本',
        );
        statistics.published += 1;
      } else {
        statistics.alreadyPublished += 1;
      }

      // This Notion page is the source of truth for the import. Close the RPC-
      // generated upsert immediately so no worker writes the same data back.
      await closeImportOutbox(client, linked.catalog.id, saved.version.id);
      statistics.outboxClosed += 1;
      const activeForum = await activateForum(client, item, linked.forum);
      if (activeForum) state.forumByNotionId.set(item.page.id, activeForum);

      statusLine(index, item, wasAlreadyPublished ? '已存在' : '已發布', saved.reused ? '重用相同來源版本' : '匯入完成');
    } catch (error) {
      statistics.failed += 1;
      statusLine(index, item, '失敗', error?.message || '未知錯誤');
    }
  }

  printSummary(statistics, options.apply);
  if (statistics.failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  // Never print environment values, request headers, or raw connector bodies.
  console.error(`匯入中止：${error?.message || '未知錯誤'}`);
  process.exitCode = 1;
});
