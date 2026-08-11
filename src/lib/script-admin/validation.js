import { invalidRequest } from './errors';

const CONTENT_KEYS = new Set([
  'name',
  'synopsis',
  'playerMin',
  'playerMax',
  'durationMinutes',
  'durationLabel',
  'priceStatus',
  'price',
  'genres',
  'customTags',
  'characters',
  'cover',
  'sortOrder',
]);

const PRICE_STATUSES = new Set(['fixed', 'free', 'tbd']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function text(value, field, { required = false, max = 500 } = {}) {
  if (value === undefined || value === null) {
    if (required) throw invalidRequest(`「${field}」為必填欄位。`, { [field]: '必填' });
    return '';
  }
  if (typeof value !== 'string') {
    throw invalidRequest(`「${field}」格式不正確。`, { [field]: '必須是文字' });
  }
  const normalized = value.trim();
  if (required && !normalized) {
    throw invalidRequest(`「${field}」為必填欄位。`, { [field]: '必填' });
  }
  if (normalized.length > max) {
    throw invalidRequest(`「${field}」內容過長。`, { [field]: `最多 ${max} 個字` });
  }
  return normalized;
}

function nullableInteger(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value) || value < min || value > max) {
    throw invalidRequest(`「${field}」格式不正確。`, {
      [field]: `必須是 ${min} 到 ${max} 之間的整數`,
    });
  }
  return value;
}

function stringList(value, field, { maxItems = 30, itemMax = 80 } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw invalidRequest(`「${field}」格式不正確。`, {
      [field]: `最多 ${maxItems} 項`,
    });
  }

  const unique = new Set();
  value.forEach((item) => {
    if (typeof item !== 'string' || !item.trim() || item.trim().length > itemMax) {
      throw invalidRequest(`「${field}」含有不正確的項目。`, {
        [field]: `每項必須是 1 到 ${itemMax} 個字`,
      });
    }
    unique.add(item.trim());
  });
  return [...unique];
}

function normalizeCharacters(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 30) {
    throw invalidRequest('「characters」格式不正確。', { characters: '最多 30 個角色' });
  }

  return value.map((character, index) => {
    if (!isPlainObject(character)) {
      throw invalidRequest('角色資料格式不正確。', { [`characters.${index}`]: '必須是物件' });
    }
    const unexpected = Object.keys(character).filter((key) => !['name', 'description'].includes(key));
    if (unexpected.length) {
      throw invalidRequest('角色資料含有不支援的欄位。', {
        [`characters.${index}`]: unexpected.join(', '),
      });
    }
    return {
      name: text(character.name, `characters.${index}.name`, { required: true, max: 80 }),
      description: text(character.description, `characters.${index}.description`, { max: 1000 }),
    };
  });
}

function normalizeWebUrl(value, field) {
  const normalized = text(value, field, { max: 2000 });
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== 'https:') throw new Error('unsupported protocol');
  } catch {
    throw invalidRequest(`「${field}」不是有效網址。`, { [field]: '必須是 https 網址' });
  }
  return normalized;
}

function focalPoint(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw invalidRequest(`「${field}」格式不正確。`, { [field]: '必須是 0 到 100 的數字' });
  }
  return value;
}

function normalizeCover(value) {
  if (value === undefined || value === null) {
    return { url: '', path: '', alt: '', focalX: null, focalY: null };
  }
  if (!isPlainObject(value)) {
    throw invalidRequest('「cover」格式不正確。', { cover: '必須是物件' });
  }
  const unexpected = Object.keys(value)
    .filter((key) => !['url', 'path', 'alt', 'focalX', 'focalY'].includes(key));
  if (unexpected.length) {
    throw invalidRequest('「cover」含有不支援的欄位。', { cover: unexpected.join(', ') });
  }

  const path = text(value.path, 'cover.path', { max: 500 });
  if (path && (path.includes('..') || !/^[a-zA-Z0-9/_\-.]+$/.test(path))) {
    throw invalidRequest('「cover.path」格式不正確。', { 'cover.path': '無效的儲存路徑' });
  }

  return {
    url: normalizeWebUrl(value.url, 'cover.url'),
    path,
    alt: text(value.alt, 'cover.alt', { max: 200 }),
    focalX: focalPoint(value.focalX, 'cover.focalX'),
    focalY: focalPoint(value.focalY, 'cover.focalY'),
  };
}

export function normalizeScriptContent(value) {
  if (!isPlainObject(value)) {
    throw invalidRequest('「content」格式不正確。', { content: '必須是物件' });
  }

  const unexpected = Object.keys(value).filter((key) => !CONTENT_KEYS.has(key));
  if (unexpected.length) {
    throw invalidRequest('內容含有不支援的欄位。', { content: unexpected.join(', ') });
  }

  const playerMin = nullableInteger(value.playerMin, 'playerMin', { min: 1, max: 30 });
  const playerMax = nullableInteger(value.playerMax, 'playerMax', { min: 1, max: 30 });
  if ((playerMin === null) !== (playerMax === null)) {
    throw invalidRequest('人數上限與下限必須同時填寫。', {
      playerMin: '請同時填寫上限與下限',
      playerMax: '請同時填寫上限與下限',
    });
  }
  if (playerMin !== null && playerMin > playerMax) {
    throw invalidRequest('人數下限不能大於上限。', { playerMin: '不能大於 playerMax' });
  }

  const priceStatus = value.priceStatus || 'tbd';
  if (!PRICE_STATUSES.has(priceStatus)) {
    throw invalidRequest('「priceStatus」格式不正確。', {
      priceStatus: '只能是 fixed、free 或 tbd',
    });
  }

  let price = null;
  if (priceStatus === 'fixed') {
    if (typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0 || value.price > 100000) {
      throw invalidRequest('固定價格必須填寫有效金額。', { price: '必須是 0 到 100000 的數字' });
    }
    price = Math.round(value.price * 100) / 100;
  } else if (priceStatus === 'free') {
    price = 0;
  }

  return {
    name: text(value.name, 'name', { required: true, max: 120 }),
    synopsis: text(value.synopsis, 'synopsis', { max: 8000 }),
    playerMin,
    playerMax,
    durationMinutes: nullableInteger(value.durationMinutes, 'durationMinutes', { min: 1, max: 1440 }),
    durationLabel: text(value.durationLabel, 'durationLabel', { max: 80 }),
    priceStatus,
    price,
    genres: stringList(value.genres, 'genres', { maxItems: 20, itemMax: 30 }),
    customTags: stringList(value.customTags, 'customTags', { maxItems: 20, itemMax: 30 }),
    characters: normalizeCharacters(value.characters),
    cover: normalizeCover(value.cover),
    sortOrder: nullableInteger(value.sortOrder ?? 0, 'sortOrder', { min: -10000, max: 10000 }) ?? 0,
  };
}

export function validatePublishableContent(value) {
  const content = normalizeScriptContent(value);
  const fields = {};

  if (!content.synopsis) fields.synopsis = '發布前必須填寫';
  if (content.playerMin === null || content.playerMax === null) {
    fields.playerMin = '發布前必須填寫';
    fields.playerMax = '發布前必須填寫';
  }
  if (content.durationMinutes === null && !content.durationLabel) {
    fields.durationMinutes = '請填寫分鐘數或時長文字';
  }
  if (content.priceStatus === 'fixed' && content.price === null) {
    fields.price = '固定價格必須填寫';
  }
  if (!content.cover.url) fields['cover.url'] = '發布前必須上傳封面';

  if (Object.keys(fields).length) {
    throw invalidRequest('這筆草稿還不能發布，請補齊必要資料。', fields);
  }
  return content;
}

export function mergeScriptContent(base, patch) {
  if (!isPlainObject(patch)) {
    throw invalidRequest('「content」格式不正確。', { content: '必須是物件' });
  }
  return normalizeScriptContent({
    ...base,
    ...patch,
    cover: patch.cover === undefined
      ? base?.cover
      : { ...(base?.cover || {}), ...patch.cover },
  });
}

export function extractScriptContentInput(input) {
  if (!isPlainObject(input)) {
    throw invalidRequest('請求內容必須是 JSON 物件。');
  }
  if (input.content !== undefined) {
    if (!isPlainObject(input.content)) {
      throw invalidRequest('「content」格式不正確。', { content: '必須是物件' });
    }
    return input.content;
  }

  return Object.fromEntries(
    Object.entries(input).filter(([key]) => CONTENT_KEYS.has(key)),
  );
}

export function slugifyScriptName(value) {
  const raw = text(value, 'slug', { required: true, max: 160 })
    .normalize('NFKC')
    .toLocaleLowerCase('zh-Hant')
    .replace(/[\u2018\u2019'`]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  const limited = Array.from(raw).slice(0, 100).join('').replace(/-+$/g, '');
  if (!limited) throw invalidRequest('無法產生有效的網址代號。', { slug: '請使用文字或數字' });
  return limited;
}

export function requireUuid(value, field = 'id') {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw invalidRequest('資料識別碼格式不正確。', { [field]: '無效的 UUID' });
  }
  return value;
}

export function normalizeIdempotencyKey(value, { required = false } = {}) {
  if (!value) {
    if (required) throw invalidRequest('缺少 Idempotency-Key，無法安全重試。');
    return null;
  }
  if (typeof value !== 'string' || value.trim().length > 200) {
    throw invalidRequest('Idempotency-Key 格式不正確。');
  }
  const normalized = value.trim();
  if (!normalized || /[\u0000-\u001f\u007f]/.test(normalized)) {
    throw invalidRequest('Idempotency-Key 格式不正確。');
  }
  return normalized;
}
