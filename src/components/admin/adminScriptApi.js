export class AdminApiError extends Error {
  constructor(message, status = 500, payload = null) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.payload = payload;
  }
}

const VALID_PRICE_STATUSES = new Set(['fixed', 'free', 'tbd']);

function asNumber(value, fallback = null) {
  if (value === '' || value === undefined || value === null) return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value.split(/[,、/\n]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function asCharacters(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((character) => {
      if (typeof character === 'string') return { name: character.trim(), description: '' };
      return {
        name: String(character?.name || '').trim(),
        description: String(character?.description || ''),
      };
    })
    .filter((character) => character.name || character.description);
}

export function createEmptyScript() {
  return {
    id: null,
    slug: '',
    status: 'draft',
    notionPageId: null,
    publishedAt: null,
    updatedAt: null,
    draftVersion: 0,
    publishedVersion: 0,
    syncStatus: 'pending',
    name: '',
    synopsis: '',
    playerMin: '',
    playerMax: '',
    durationMinutes: '',
    durationLabel: '',
    priceStatus: 'tbd',
    price: '',
    genres: [],
    customTags: [],
    characters: [],
    cover: {
      url: '',
      path: '',
      alt: '',
      focalX: 50,
      focalY: 50,
    },
    sortOrder: 0,
  };
}

export function normalizeAdminScript(input = {}) {
  const base = createEmptyScript();
  const coverInput = input.cover || {};
  const priceStatus = VALID_PRICE_STATUSES.has(input.priceStatus)
    ? input.priceStatus
    : (input.price === 0 ? 'free' : input.price !== undefined && input.price !== null ? 'fixed' : 'tbd');

  return {
    ...base,
    ...input,
    id: input.id ?? null,
    slug: String(input.slug || ''),
    status: String(input.status || 'draft'),
    notionPageId: input.notionPageId || null,
    publishedAt: input.publishedAt || null,
    updatedAt: input.updatedAt || null,
    draftVersion: asNumber(input.draftVersion, 0),
    publishedVersion: asNumber(input.publishedVersion, 0),
    syncStatus: String(input.syncStatus || 'pending'),
    name: String(input.name || ''),
    synopsis: String(input.synopsis || ''),
    playerMin: asNumber(input.playerMin, ''),
    playerMax: asNumber(input.playerMax, ''),
    durationMinutes: asNumber(input.durationMinutes, ''),
    durationLabel: String(input.durationLabel || ''),
    priceStatus,
    price: asNumber(input.price, ''),
    genres: asStringArray(input.genres),
    customTags: asStringArray(input.customTags),
    characters: asCharacters(input.characters),
    cover: {
      url: String(coverInput.url || input.coverUrl || ''),
      path: String(coverInput.path || input.coverPath || ''),
      alt: String(coverInput.alt || input.coverAlt || ''),
      focalX: Math.min(100, Math.max(0, asNumber(coverInput.focalX, 50))),
      focalY: Math.min(100, Math.max(0, asNumber(coverInput.focalY, 50))),
    },
    sortOrder: asNumber(input.sortOrder, 0),
  };
}

export function toAdminScriptPayload(script) {
  const normalized = normalizeAdminScript(script);
  return {
    name: normalized.name.trim(),
    synopsis: normalized.synopsis.trim(),
    playerMin: asNumber(normalized.playerMin),
    playerMax: asNumber(normalized.playerMax),
    durationMinutes: asNumber(normalized.durationMinutes),
    durationLabel: normalized.durationLabel.trim(),
    priceStatus: normalized.priceStatus,
    price: normalized.priceStatus === 'fixed' ? asNumber(normalized.price) : null,
    genres: normalized.genres,
    customTags: normalized.customTags,
    characters: normalized.characters
      .map((character) => ({
        name: character.name.trim(),
        description: character.description.trim(),
      }))
      .filter((character) => character.name || character.description),
    cover: {
      url: normalized.cover.url,
      path: normalized.cover.path,
      alt: normalized.cover.alt.trim(),
      focalX: normalized.cover.focalX,
      focalY: normalized.cover.focalY,
    },
    sortOrder: asNumber(normalized.sortOrder, 0),
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || payload?.message || (
      response.status === 401 ? '請先登入員工帳號。'
        : response.status === 403 ? '這個帳號沒有後台權限。'
          : response.status === 404 ? '找不到這筆劇本資料。'
            : response.status === 409 ? '資料已被其他人更新，請重新整理後再試。'
              : '後台暫時無法完成這個動作。'
    );
    throw new AdminApiError(message, response.status, payload);
  }

  return payload;
}

export async function adminRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  return parseResponse(response);
}

function extractScript(payload) {
  return normalizeAdminScript(payload?.script || payload?.data || payload || {});
}

export async function listAdminScripts() {
  const pageSize = 100;
  const collected = [];
  let offset = 0;
  let total = null;

  do {
    const payload = await adminRequest(`/api/admin/scripts?limit=${pageSize}&offset=${offset}`);
    const rows = Array.isArray(payload)
      ? payload
      : (payload?.scripts || payload?.items || payload?.data || []);
    const page = Array.isArray(rows) ? rows : [];
    collected.push(...page);
    total = Number.isInteger(payload?.pagination?.total)
      ? payload.pagination.total
      : collected.length;
    offset += page.length;
    if (page.length < pageSize) break;
  } while (offset < total);

  return collected.map(normalizeAdminScript);
}

export async function checkAdminAccess() {
  await adminRequest('/api/admin/scripts?limit=1');
  return true;
}

export async function getAdminScript(id) {
  return extractScript(await adminRequest(`/api/admin/scripts/${encodeURIComponent(id)}`));
}

export async function createAdminScript(script) {
  return extractScript(await adminRequest('/api/admin/scripts', {
    method: 'POST',
    body: JSON.stringify(toAdminScriptPayload(script)),
  }));
}

export async function updateAdminScript(id, script) {
  return extractScript(await adminRequest(`/api/admin/scripts/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...toAdminScriptPayload(script),
      draftVersion: script.draftVersion ?? 0,
    }),
  }));
}

export async function publishAdminScript(id, draftVersion) {
  return extractScript(await adminRequest(`/api/admin/scripts/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: JSON.stringify({ draftVersion }),
  }));
}

export async function unpublishAdminScript(id, publishedVersion) {
  return extractScript(await adminRequest(`/api/admin/scripts/${encodeURIComponent(id)}/unpublish`, {
    method: 'POST',
    body: JSON.stringify({ publishedVersion }),
  }));
}

export async function retryAdminScriptSync(id) {
  return extractScript(await adminRequest(`/api/admin/scripts/${encodeURIComponent(id)}/sync`, {
    method: 'POST',
    body: JSON.stringify({}),
  }));
}

export async function requestCoverUpload(file, scriptId) {
  return adminRequest('/api/admin/scripts/cover-upload', {
    method: 'POST',
    body: JSON.stringify({
      scriptId: scriptId || null,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });
}
