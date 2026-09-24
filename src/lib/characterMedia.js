const MAX_CHARACTERS = 30;
const MAX_SERIALIZED_LENGTH = 190000;

export class CharacterMediaError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'CharacterMediaError';
    this.field = field;
  }
}

function mediaText(value, field, max, required = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new CharacterMediaError(`「${field}」必須是${required ? '非空白的' : ''}文字，最多 ${max} 個字。`, field);
  }
  return value.trim();
}

export function getCharacterImageStorageBase(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  bucket = process.env.SCRIPT_COVERS_BUCKET || 'script-covers',
) {
  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || url.pathname !== '/' || !/^[a-zA-Z0-9_-]+$/.test(bucket)) return '';
    return `${url.origin}/storage/v1/object/public/${bucket}/`;
  } catch {
    return '';
  }
}

export function isSafeCharacterImageUrl(value, path, allowedBase = getCharacterImageStorageBase()) {
  if (!allowedBase || typeof value !== 'string' || value.length > 2000
    || typeof path !== 'string' || !path || path.length > 500 || path.includes('..')
    || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(?:jpg|jpeg|png|webp)$/i.test(path)) return false;
  return value === `${allowedBase}${path}`;
}

// Keep these fields optional so loading and saving a legacy record is lossless.
// An explicit null image removes media; uploaded objects always have a usable URL.
export function normalizeCharacterMedia(character, field = 'character', { allowedBase } = {}) {
  const output = {};
  if (character?.display !== undefined) {
    if (!['avatar', 'card'].includes(character.display)) {
      throw new CharacterMediaError('角色圖片顯示方式只能是 avatar 或 card。', `${field}.display`);
    }
    output.display = character.display;
  }
  if (character?.image === undefined || character.image === null) return output;
  const image = character.image;
  if (typeof image !== 'object' || Array.isArray(image)
    || Object.keys(image).some((key) => !['url', 'path', 'alt'].includes(key))) {
    throw new CharacterMediaError('角色圖片只支援 url、path 與 alt 欄位。', `${field}.image`);
  }
  const url = mediaText(image.url, `${field}.image.url`, 2000, true);
  const path = mediaText(image.path, `${field}.image.path`, 500, true);
  if (!isSafeCharacterImageUrl(url, path, allowedBase)) {
    throw new CharacterMediaError('角色圖片必須使用本站儲存空間的永久網址，且與 path 完全相符。', `${field}.image.url`);
  }
  output.image = { url, path, alt: mediaText(image.alt, `${field}.image.alt`, 200) };
  output.display = output.display || 'avatar';
  return output;
}

export function serializeCharacterImages(characters = [], options) {
  if (!Array.isArray(characters) || characters.length > MAX_CHARACTERS) {
    throw new CharacterMediaError('角色圖片最多支援 30 個角色。', 'characters');
  }
  const names = new Set();
  const entries = characters.flatMap((character, index) => {
    const field = `characters.${index}`;
    const description = mediaText(character?.description, `${field}.description`, 1000);
    if (character?.image == null && !description) return [];
    const name = mediaText(character.name, `${field}.name`, 80, true);
    if (names.has(name)) throw new CharacterMediaError('角色資料名稱不能重複。', `${field}.name`);
    names.add(name);
    return [{ name, ...(description ? { description } : {}), ...normalizeCharacterMedia(character, field, options) }];
  });
  return JSON.stringify({ version: 1, characters: entries });
}

// Invalid optional data must never prevent the legacy catalog from rendering.
export function characterMetadataFromCharacters(characters, options) {
  const empty = { characterImages: {}, characterDescriptions: {} };
  if (!Array.isArray(characters) || characters.length > MAX_CHARACTERS) return empty;
  const images = new Map();
  const descriptions = new Map();
  const names = new Set();
  const duplicates = new Set();
  for (const character of characters) {
    let name;
    try {
      name = mediaText(character?.name, 'name', 80, true);
    } catch {
      continue;
    }
    if (names.has(name)) duplicates.add(name);
    names.add(name);
    try {
      const description = mediaText(character?.description, 'description', 1000);
      if (description) descriptions.set(name, description);
    } catch {
      // A malformed description does not hide an otherwise valid portrait.
    }
    try {
      const media = normalizeCharacterMedia(character, 'character', options);
      if (media.image) images.set(name, media);
    } catch {
      // An invalid image can use its static fallback while retaining valid text.
    }
  }
  duplicates.forEach((name) => { images.delete(name); descriptions.delete(name); });
  return { characterImages: Object.fromEntries(images), characterDescriptions: Object.fromEntries(descriptions) };
}

export function characterImagesFromCharacters(characters, options) {
  return characterMetadataFromCharacters(characters, options).characterImages;
}

export function parseCharacterMetadata(value, options) {
  const empty = { characterImages: {}, characterDescriptions: {} };
  if (typeof value !== 'string' || !value || value.length > MAX_SERIALIZED_LENGTH) return empty;
  try {
    const parsed = JSON.parse(value);
    if (parsed?.version !== 1) return empty;
    return characterMetadataFromCharacters(parsed.characters, options);
  } catch {
    return empty;
  }
}

export function parseCharacterImages(value, options) {
  return parseCharacterMetadata(value, options).characterImages;
}

export function matchCharacterMetadata(metadata, currentNames) {
  // Notion's current role names are authoritative. Never resurrect a deleted
  // role or attach its old description/image to a manually renamed role.
  const names = new Set(currentNames);
  return {
    characterImages: Object.fromEntries(Object.entries(metadata.characterImages).filter(([name]) => names.has(name))),
    characterDescriptions: Object.fromEntries(Object.entries(metadata.characterDescriptions).filter(([name]) => names.has(name))),
  };
}

export function getCharacterMedia(characterImages, name, options) {
  if (!characterImages || !Object.hasOwn(characterImages, name)) return null;
  try {
    const media = normalizeCharacterMedia(characterImages[name], 'character', options);
    return media.image ? media : null;
  } catch {
    return null;
  }
}

export function parseCharacterLabel(line, characterImages = {}) {
  const text = String(line || '').trim();
  const separators = ['｜', '：', ':', '－', ' - '];
  // A supplied exact name can itself contain punctuation. Resolve that name
  // before parsing the legacy flat text, without approximate image matching.
  if (Object.hasOwn(characterImages, text)) return { name: text, description: '' };
  const knownName = Object.keys(characterImages)
    .sort((left, right) => right.length - left.length)
    .find((name) => separators.some((separator) => text.startsWith(`${name}${separator}`)));
  if (knownName) {
    const remainder = text.slice(knownName.length);
    const separator = separators.find((value) => remainder.startsWith(value));
    return { name: knownName, description: remainder.slice(separator.length).trim() };
  }
  // Retain the existing interpretation for legacy labels, and support the
  // separator used by the Notion sync writer when there is no older separator.
  for (const separator of ['：', ':', '－', ' - ', '｜']) {
    const index = text.indexOf(separator);
    if (index >= 0) return { name: text.slice(0, index).trim(), description: text.slice(index + separator.length).trim() };
  }
  return { name: text, description: '' };
}

export function buildNotionCharacterImagesProperty(schema, characters = [], propertyName = '角色圖片', options) {
  const serialized = serializeCharacterImages(characters, options);
  const hasMetadata = characters.some((character) => character?.image != null || character?.description?.trim());
  const property = schema[propertyName];
  if (!property && !hasMetadata) return {};
  if (property?.type !== 'rich_text') {
    throw new CharacterMediaError(`Notion 缺少「${propertyName}」文字欄位，無法同步角色圖片或簡介。`, 'characters');
  }
  const richText = [];
  for (let index = 0; index < serialized.length; index += 1900) {
    richText.push({ type: 'text', text: { content: serialized.slice(index, index + 1900) } });
  }
  // Always clear removed images when the optional column exists.
  return { [propertyName]: { rich_text: richText } };
}
