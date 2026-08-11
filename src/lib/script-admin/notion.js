import { randomUUID } from 'node:crypto';
import {
  SCRIPT_COLUMNS,
  SCRIPT_SYNC_JOB_COLUMNS,
  SCRIPT_SYNC_JOB_TABLE,
  SCRIPT_TABLE,
  SCRIPT_VERSION_COLUMNS,
  SCRIPT_VERSION_TABLE,
} from './constants';
import { databaseError } from './errors';
import { ensureForumScript } from './forum';

const NOTION_API_ROOT = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const SCHEMA_CACHE_MS = 5 * 60 * 1000;
const PROCESSING_STALE_MS = 5 * 60 * 1000;
const NOTION_LEASE_SECONDS = 15 * 60;
const LEASE_RETRY_DELAY_MS = 5000;
const TEMPORARY_TITLE_PREFIX = '⟦BGLARP-CATALOG:';
const MARKER_ARCHIVE_CONCURRENCY = 5;
let schemaCache = null;

class NotionSyncError extends Error {
  constructor(message, status = null) {
    super(message);
    this.name = 'NotionSyncError';
    this.status = status;
  }
}

function notionConfiguration() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.DATABASE_ID;
  if (!token || !databaseId) {
    throw new NotionSyncError('未完成 Notion 同步設定');
  }
  return { token, databaseId };
}

async function notionRequest(path, init = {}) {
  const { token } = notionConfiguration();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${NOTION_API_ROOT}${path}`, {
      ...init,
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VERSION,
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      // Response bodies can contain integration details. Do not put them in
      // the job error or the HTTP response returned to staff.
      throw new NotionSyncError(`Notion 同步失敗（HTTP ${response.status}）`, response.status);
    }
    return response.json();
  } catch (error) {
    if (error instanceof NotionSyncError) throw error;
    if (error?.name === 'AbortError') throw new NotionSyncError('Notion 同步逾時');
    throw new NotionSyncError('Notion 連線失敗');
  } finally {
    clearTimeout(timeout);
  }
}

async function getNotionDatabaseSchema() {
  const { databaseId } = notionConfiguration();
  const now = Date.now();
  if (schemaCache?.databaseId === databaseId && schemaCache.expiresAt > now) {
    return schemaCache.properties;
  }

  const database = await notionRequest(`/databases/${databaseId}`);
  const properties = database?.properties || {};
  schemaCache = { databaseId, properties, expiresAt: now + SCHEMA_CACHE_MS };
  return properties;
}

function chunks(value, size = 1900) {
  const result = [];
  for (let index = 0; index < value.length && result.length < 100; index += size) {
    result.push(value.slice(index, index + size));
  }
  return result;
}

function richText(value) {
  return chunks(value || '').map((content) => ({
    type: 'text',
    text: { content },
  }));
}

function namedOptions(values) {
  return (values || []).slice(0, 100).map((name) => ({ name: name.slice(0, 100) }));
}

function playerLabels(content) {
  if (!content.playerMin || !content.playerMax) return [];
  const labels = [];
  for (let count = content.playerMin; count <= content.playerMax; count += 1) {
    labels.push(`${count}人`);
  }
  return labels;
}

function characterText(characters) {
  return (characters || [])
    .map(({ name, description }) => description ? `${name}｜${description}` : name)
    .join('\n');
}

function durationText(content) {
  if (content.durationLabel) return content.durationLabel;
  if (!content.durationMinutes) return '';
  if (content.durationMinutes % 60 === 0) return `${content.durationMinutes / 60}小時`;
  return `${content.durationMinutes}分鐘`;
}

function setProperty(output, schema, name, valueByType) {
  const property = schema[name];
  if (!property) return false;
  const value = valueByType[property.type];
  if (value === undefined) return false;
  output[name] = { [property.type]: value };
  return true;
}

function propertyName(envName, fallback) {
  return process.env[envName] || fallback;
}

function titlePropertyName(schema) {
  const configuredTitle = propertyName('SCRIPT_NOTION_TITLE_PROPERTY', '劇本名稱');
  const name = schema[configuredTitle]?.type === 'title'
    ? configuredTitle
    : Object.entries(schema).find(([, value]) => value.type === 'title')?.[0];
  if (!name) throw new NotionSyncError('Notion 資料庫缺少標題欄位');
  return name;
}

function temporaryTitleMarker(scriptId) {
  return `${TEMPORARY_TITLE_PREFIX}${scriptId}⟧`;
}

function buildNotionProperties(schema, content) {
  const output = {};
  const titleName = titlePropertyName(schema);

  output[titleName] = { title: richText(content.name) };
  setProperty(output, schema, propertyName('SCRIPT_NOTION_SYNOPSIS_PROPERTY', '劇情簡介'), {
    rich_text: richText(content.synopsis),
    title: richText(content.synopsis),
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_CHARACTERS_PROPERTY', '角色'), {
    rich_text: richText(characterText(content.characters)),
    multi_select: namedOptions(content.characters.map(({ name }) => name)),
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_GENRES_PROPERTY', '類型'), {
    multi_select: namedOptions(content.genres),
    rich_text: richText(content.genres.join('、')),
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_CUSTOM_TAGS_PROPERTY', '類型標籤'), {
    rich_text: richText(content.customTags.join('、')),
    multi_select: namedOptions(content.customTags),
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_DURATION_PROPERTY', '時長'), {
    rich_text: richText(durationText(content)),
    number: content.durationMinutes,
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_PRICE_PROPERTY', '價格'), {
    number: content.priceStatus === 'tbd' ? null : content.price,
    rich_text: richText(content.priceStatus === 'tbd' ? '待定' : String(content.price)),
  });
  setProperty(output, schema, propertyName('SCRIPT_NOTION_PLAYERS_PROPERTY', '人數'), {
    multi_select: namedOptions(playerLabels(content)),
    rich_text: richText(playerLabels(content).join('、')),
  });

  return output;
}

async function queryTemporaryPages(databaseId, titleName, marker, renewLease) {
  await renewLease?.();
  const result = await notionRequest(`/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({
      filter: {
        property: titleName,
        title: { equals: marker },
      },
      page_size: 100,
    }),
  });
  return (result?.results || [])
    .filter((page) => page?.id)
    .sort((left, right) => {
      const byTime = String(left.created_time || '').localeCompare(String(right.created_time || ''));
      return byTime || String(left.id).localeCompare(String(right.id));
    });
}

async function archiveNotionPage(pageId, renewLease) {
  if (!pageId) return;
  await renewLease?.();
  try {
    await notionRequest(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true }),
    });
  } catch (error) {
    if (error.status !== 404) throw error;
  }
}

async function archiveNotionPages(pageIds, authoritativePageId, renewLease) {
  const ids = [...new Set(pageIds.filter(Boolean))]
    .filter((pageId) => pageId !== authoritativePageId);
  for (let index = 0; index < ids.length; index += MARKER_ARCHIVE_CONCURRENCY) {
    await renewLease?.();
    const batch = ids.slice(index, index + MARKER_ARCHIVE_CONCURRENCY);
    await Promise.all(batch.map((pageId) => archiveNotionPage(pageId)));
  }
}

async function patchPublishedNotionPage(pageId, pageBody, renewLease) {
  await renewLease?.();
  const page = await notionRequest(`/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ...pageBody, archived: false }),
  });
  return page.id;
}

async function claimCatalogNotionPageId(
  adminClient,
  scriptId,
  candidatePageId,
  renewLease,
) {
  const { data: claimed, error: claimError } = await adminClient
    .from(SCRIPT_TABLE)
    .update({ notion_page_id: candidatePageId })
    .eq('id', scriptId)
    .is('notion_page_id', null)
    .select('notion_page_id')
    .maybeSingle();
  if (claimError) throw databaseError('claim catalog notion page id', claimError);
  if (claimed?.notion_page_id) return claimed.notion_page_id;

  const { data: current, error: currentError } = await adminClient
    .from(SCRIPT_TABLE)
    .select('notion_page_id')
    .eq('id', scriptId)
    .maybeSingle();
  if (currentError) throw databaseError('load authoritative notion page id', currentError);
  if (!current?.notion_page_id) {
    throw new NotionSyncError('無法保存 Notion 頁面識別碼');
  }

  if (current.notion_page_id !== candidatePageId) {
    await archiveNotionPage(candidatePageId, renewLease);
  }
  return current.notion_page_id;
}

async function clearMissingCatalogNotionPageId(adminClient, scriptId, missingPageId) {
  const { error } = await adminClient
    .from(SCRIPT_TABLE)
    .update({ notion_page_id: null })
    .eq('id', scriptId)
    .eq('notion_page_id', missingPageId);
  if (error) throw databaseError('clear missing notion page id', error);
}

async function publishToNotion(adminClient, script, version, renewLease) {
  await renewLease?.();
  const { databaseId } = notionConfiguration();
  const schema = await getNotionDatabaseSchema();
  const titleName = titlePropertyName(schema);
  const marker = temporaryTitleMarker(script.id);
  const properties = buildNotionProperties(schema, version.content);
  const coverUrl = version.content?.cover?.url;
  const pageBody = {
    properties,
    cover: coverUrl ? { type: 'external', external: { url: coverUrl } } : null,
  };

  const markerPages = await queryTemporaryPages(databaseId, titleName, marker, renewLease);

  if (script.notion_page_id) {
    try {
      await archiveNotionPages(
        markerPages.map(({ id }) => id),
        script.notion_page_id,
        renewLease,
      );
      return await patchPublishedNotionPage(script.notion_page_id, pageBody, renewLease);
    } catch (error) {
      if (error.status !== 404) throw error;
      await clearMissingCatalogNotionPageId(adminClient, script.id, script.notion_page_id);
    }
  }

  let candidatePage = markerPages[0] || null;
  if (!candidatePage) {
    await renewLease?.();
    candidatePage = await notionRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          [titleName]: { title: richText(marker) },
        },
      }),
    });
  }
  if (!candidatePage?.id) throw new NotionSyncError('Notion 未回傳頁面識別碼');

  const authoritativePageId = await claimCatalogNotionPageId(
    adminClient,
    script.id,
    candidatePage.id,
    renewLease,
  );
  const possibleDuplicates = new Set([
    ...markerPages.map(({ id }) => id),
    candidatePage.id,
  ]);
  await archiveNotionPages([...possibleDuplicates], authoritativePageId, renewLease);

  return patchPublishedNotionPage(authoritativePageId, pageBody, renewLease);
}

async function unpublishFromNotion(adminClient, script, renewLease) {
  await renewLease?.();
  const { databaseId } = notionConfiguration();
  const schema = await getNotionDatabaseSchema();
  const markerPages = await queryTemporaryPages(
    databaseId,
    titlePropertyName(schema),
    temporaryTitleMarker(script.id),
    renewLease,
  );
  await archiveNotionPages(
    markerPages.map(({ id }) => id),
    script.notion_page_id,
    renewLease,
  );
  if (!script.notion_page_id) return null;
  await archiveNotionPage(script.notion_page_id, renewLease);
  return script.notion_page_id;
}

function safeJobError(error) {
  if (error instanceof NotionSyncError) return error.message.slice(0, 300);
  return 'Notion 同步失敗';
}

function nextRetryAt(attempts) {
  const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
  return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
}

async function markJob(adminClient, id, patch, operation) {
  const { data, error } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .maybeSingle();
  if (error) throw databaseError(operation, error);
  return data;
}

async function claimNotionSyncLease(adminClient, scriptId, leaseToken) {
  const { data, error } = await adminClient.rpc('claim_catalog_script_notion_sync_lease', {
    p_script_id: scriptId,
    p_lease_token: leaseToken,
    p_lease_seconds: NOTION_LEASE_SECONDS,
  });
  if (error) throw databaseError('claim per-script notion lease', error);
  return data === true;
}

async function releaseNotionSyncLease(adminClient, scriptId, leaseToken) {
  const { error } = await adminClient.rpc('release_catalog_script_notion_sync_lease', {
    p_script_id: scriptId,
    p_lease_token: leaseToken,
  });
  if (error) {
    // Do not turn an already-converged catalog into HTTP 500. The lease has a
    // short expiry and token matching prevents this worker clearing a successor.
    console.error('[script-admin] release per-script notion lease failed', {
      code: error.code || 'unknown',
    });
  }
}

async function completeConvergedNotionJobs(adminClient, script, excludedJobId = null) {
  const action = script.status === 'published'
    ? 'upsert'
    : script.status === 'unpublished' ? 'unpublish' : null;
  if (!action || !script.published_version_id) return;

  const now = new Date().toISOString();
  let query = adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .update({
      status: 'succeeded',
      last_error: null,
      next_attempt_at: now,
      updated_at: now,
    })
    .eq('script_id', script.id)
    .eq('version_id', script.published_version_id)
    .eq('target', 'notion')
    .eq('action', action)
    .in('status', ['pending', 'failed', 'processing']);
  if (excludedJobId) query = query.neq('id', excludedJobId);
  const { error } = await query;
  if (error) throw databaseError('complete converged notion jobs', error);
}

async function deferJobForActiveLease(adminClient, claimed, previousAttempts) {
  const { data, error } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .update({
      status: 'pending',
      attempts: previousAttempts,
      next_attempt_at: new Date(Date.now() + LEASE_RETRY_DELAY_MS).toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', claimed.id)
    .eq('status', 'processing')
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .maybeSingle();
  if (error) throw databaseError('defer notion job for active script lease', error);
  if (data) return data;

  const { data: current, error: currentError } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .eq('id', claimed.id)
    .maybeSingle();
  if (currentError) throw databaseError('reload notion job after lease contention', currentError);
  return current;
}

async function loadCatalogState(adminClient, scriptId) {
  const { data: script, error: scriptError } = await adminClient
    .from(SCRIPT_TABLE)
    .select(SCRIPT_COLUMNS)
    .eq('id', scriptId)
    .maybeSingle();
  if (scriptError) throw databaseError('load script for notion sync', scriptError);
  if (!script) throw new NotionSyncError('同步工作缺少劇本資料');

  let version = null;
  if (script.published_version_id) {
    const { data, error } = await adminClient
      .from(SCRIPT_VERSION_TABLE)
      .select(SCRIPT_VERSION_COLUMNS)
      .eq('id', script.published_version_id)
      .maybeSingle();
    if (error) throw databaseError('load version for notion convergence', error);
    version = data;
  }
  return { script, version };
}

function catalogStateKey(script) {
  return `${script.status}:${script.published_version_id || ''}`;
}

function jobMatchesCatalog(job, script) {
  if (job.action === 'upsert') {
    return script.status === 'published' && script.published_version_id === job.version_id;
  }
  if (job.action === 'unpublish') {
    return script.status === 'unpublished' && script.published_version_id === job.version_id;
  }
  return false;
}

async function executeNotionState(
  adminClient,
  script,
  version,
  pageIdHint = null,
  renewLease,
) {
  if (!version) throw new NotionSyncError('同步工作缺少正式版本');
  if (!['published', 'unpublished'].includes(script.status)) {
    throw new NotionSyncError('劇本目前沒有可同步的正式狀態');
  }

  let projectedScript = {
    ...script,
    notion_page_id: script.notion_page_id || pageIdHint || null,
  };
  await renewLease?.();
  const isActive = script.status === 'published';
  const forumScriptId = await ensureForumScript(adminClient, projectedScript, version, isActive);
  projectedScript = { ...projectedScript, forum_script_id: forumScriptId };

  const notionPageId = isActive
    ? await publishToNotion(adminClient, projectedScript, version, renewLease)
    : await unpublishFromNotion(adminClient, projectedScript, renewLease);
  return {
    forumScriptId,
    notionPageId: notionPageId || projectedScript.notion_page_id || null,
  };
}

async function commitNotionProjection(adminClient, script, version, projection) {
  const notionPageId = projection.notionPageId;
  if (notionPageId && notionPageId !== script.notion_page_id) {
    const { error } = await adminClient
      .from(SCRIPT_TABLE)
      .update({ notion_page_id: notionPageId })
      .eq('id', script.id);
    if (error) throw databaseError('save notion page id', error);
  }

  await ensureForumScript(adminClient, {
    ...script,
    forum_script_id: projection.forumScriptId || script.forum_script_id,
    notion_page_id: notionPageId || script.notion_page_id,
  }, version, script.status === 'published');
}

async function convergeNotionToCurrentCatalog(
  adminClient,
  scriptId,
  pageIdHint = null,
  renewLease,
) {
  let hint = pageIdHint;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await renewLease?.();
    const before = await loadCatalogState(adminClient, scriptId);
    const expectedState = catalogStateKey(before.script);

    if (hint && before.script.notion_page_id && hint !== before.script.notion_page_id) {
      await archiveNotionPage(hint, renewLease);
      hint = before.script.notion_page_id;
    }

    const projection = await executeNotionState(
      adminClient,
      before.script,
      before.version,
      hint,
      renewLease,
    );
    const afterExternalCall = await loadCatalogState(adminClient, scriptId);
    if (catalogStateKey(afterExternalCall.script) !== expectedState) {
      hint = projection.notionPageId || hint;
      continue;
    }

    await commitNotionProjection(adminClient, afterExternalCall.script, before.version, projection);
    const afterCommit = await loadCatalogState(adminClient, scriptId);
    if (catalogStateKey(afterCommit.script) === expectedState) {
      return { notionPageId: projection.notionPageId, state: afterCommit };
    }
    hint = projection.notionPageId || hint;
  }

  throw new NotionSyncError('劇本狀態持續變動，已延後 Notion 同步');
}

/**
 * Claims and executes one Notion outbox job. It intentionally converts
 * integration failures into a failed job result instead of throwing, so a
 * published Supabase version is never rolled back because Notion is down.
 */
export async function processNotionSyncJob(adminClient, jobId, { force = false } = {}) {
  const { data: existing, error: loadError } = await adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .eq('id', jobId)
    .maybeSingle();
  if (loadError) throw databaseError('load notion sync job', loadError);
  if (!existing || existing.status === 'succeeded') return existing;
  const staleCutoff = new Date(Date.now() - PROCESSING_STALE_MS);
  const processingIsStale = existing.status === 'processing'
    && (!existing.updated_at || new Date(existing.updated_at) <= staleCutoff);
  if (existing.status === 'processing' && !force && !processingIsStale) return existing;
  if (
    !force
    && existing.status !== 'processing'
    && existing.next_attempt_at
    && new Date(existing.next_attempt_at) > new Date()
  ) {
    return existing;
  }

  const attempts = (existing.attempts || 0) + 1;
  let claimQuery = adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .update({
      status: 'processing',
      attempts,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);
  if (existing.status === 'processing') {
    claimQuery = claimQuery.eq('status', 'processing');
    if (!force) claimQuery = claimQuery.lte('updated_at', staleCutoff.toISOString());
  } else {
    claimQuery = claimQuery.in('status', ['pending', 'failed']);
  }
  const { data: claimed, error: claimError } = await claimQuery
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .maybeSingle();
  if (claimError) throw databaseError('claim notion sync job', claimError);
  if (!claimed) return existing;

  const leaseToken = randomUUID();
  let leaseAcquired = false;
  try {
    leaseAcquired = await claimNotionSyncLease(adminClient, claimed.script_id, leaseToken);
  } catch (error) {
    return markJob(adminClient, claimed.id, {
      status: 'failed',
      next_attempt_at: nextRetryAt(attempts),
      last_error: safeJobError(error),
    }, 'fail notion lease claim');
  }

  if (!leaseAcquired) {
    return deferJobForActiveLease(adminClient, claimed, existing.attempts || 0);
  }

  const renewLease = async () => {
    const renewed = await claimNotionSyncLease(adminClient, claimed.script_id, leaseToken);
    if (!renewed) throw new NotionSyncError('Notion 同步租約已失效，請稍後重試');
  };

  try {
    try {
      await renewLease();
      const initial = await loadCatalogState(adminClient, claimed.script_id);
      if (!jobMatchesCatalog(claimed, initial.script)) {
        const convergedState = await convergeNotionToCurrentCatalog(
          adminClient,
          claimed.script_id,
          initial.script.notion_page_id,
          renewLease,
        );
        await completeConvergedNotionJobs(
          adminClient,
          convergedState.state.script,
          claimed.id,
        );
        return markJob(adminClient, claimed.id, {
          status: 'succeeded',
          next_attempt_at: new Date().toISOString(),
          last_error: null,
        }, 'complete obsolete notion sync job');
      }

      const initialState = catalogStateKey(initial.script);
      const projection = await executeNotionState(
        adminClient,
        initial.script,
        initial.version,
        initial.script.notion_page_id,
        renewLease,
      );
      const afterExternalCall = await loadCatalogState(adminClient, claimed.script_id);
      let convergedState;
      if (catalogStateKey(afterExternalCall.script) === initialState) {
        await commitNotionProjection(
          adminClient,
          afterExternalCall.script,
          initial.version,
          projection,
        );
        const afterCommit = await loadCatalogState(adminClient, claimed.script_id);
        if (catalogStateKey(afterCommit.script) === initialState) {
          convergedState = {
            notionPageId: projection.notionPageId,
            state: afterCommit,
          };
        } else {
          convergedState = await convergeNotionToCurrentCatalog(
            adminClient,
            claimed.script_id,
            projection.notionPageId,
            renewLease,
          );
        }
      } else {
        convergedState = await convergeNotionToCurrentCatalog(
          adminClient,
          claimed.script_id,
          projection.notionPageId,
          renewLease,
        );
      }

      await completeConvergedNotionJobs(
        adminClient,
        convergedState.state.script,
        claimed.id,
      );
      return markJob(adminClient, claimed.id, {
        status: 'succeeded',
        next_attempt_at: new Date().toISOString(),
        last_error: null,
      }, 'complete notion sync job');
    } catch (caughtError) {
      let error = caughtError;
      try {
        const current = await loadCatalogState(adminClient, claimed.script_id);
        if (!jobMatchesCatalog(claimed, current.script)) {
          const convergedState = await convergeNotionToCurrentCatalog(
            adminClient,
            claimed.script_id,
            current.script.notion_page_id,
            renewLease,
          );
          await completeConvergedNotionJobs(
            adminClient,
            convergedState.state.script,
            claimed.id,
          );
          return markJob(adminClient, claimed.id, {
            status: 'succeeded',
            next_attempt_at: new Date().toISOString(),
            last_error: null,
          }, 'complete superseded notion sync job after recovery');
        }
      } catch (recoveryError) {
        error = recoveryError;
      }
      return markJob(adminClient, claimed.id, {
        status: 'failed',
        next_attempt_at: nextRetryAt(attempts),
        last_error: safeJobError(error),
      }, 'fail notion sync job');
    }
  } finally {
    await releaseNotionSyncLease(adminClient, claimed.script_id, leaseToken);
  }
}

export async function findLatestNotionJob(adminClient, scriptId, versionId, action, statuses = null) {
  let query = adminClient
    .from(SCRIPT_SYNC_JOB_TABLE)
    .select(SCRIPT_SYNC_JOB_COLUMNS)
    .eq('script_id', scriptId)
    .eq('version_id', versionId)
    .eq('target', 'notion')
    .eq('action', action)
    .order('updated_at', { ascending: false })
    .limit(1);
  if (statuses?.length) query = query.in('status', statuses);
  const { data, error } = await query.maybeSingle();
  if (error) throw databaseError('load latest notion job', error);
  return data;
}
