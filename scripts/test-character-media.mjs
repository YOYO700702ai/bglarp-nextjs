import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNotionCharacterImagesProperty,
  characterImagesFromCharacters,
  characterMetadataFromCharacters,
  getCharacterImageStorageBase,
  getCharacterMedia,
  isSafeCharacterImageUrl,
  matchCharacterMetadata,
  normalizeCharacterMedia,
  parseCharacterLabel,
  parseCharacterImages,
  parseCharacterMetadata,
  serializeCharacterImages,
} from '../src/lib/characterMedia.js';
import { normalizeAdminScript, toAdminScriptPayload } from '../src/components/admin/adminScriptApi.js';
import { mapPublishedCatalogRow } from '../src/lib/publishedScripts.js';

const storageUrl = 'https://catalog-example.supabase.co';
const allowedBase = getCharacterImageStorageBase(storageUrl);
const options = { allowedBase };
const path = '2026/09/ai/11111111-1111-4111-8111-111111111111.jpg';
const image = { url: `${allowedBase}${path}`, path, alt: '貪婪魔女的親眷完整圖卡' };
const characters = [
  { name: '貪婪魔女的親眷', description: '第一行\n第二行｜保留文字：原文', image, display: 'card' },
  { name: '嫉妒魔女的親眷', description: '沒有新圖片的原角色' },
];

test('new media round-trips without changing role names or descriptions in the staff editor', () => {
  const input = { name: '魔女論破', characters };
  const normalized = normalizeAdminScript(input);
  assert.deepEqual(normalized.characters, characters);
  assert.deepEqual(toAdminScriptPayload(normalized).characters, characters);
  assert.deepEqual(normalizeCharacterMedia(characters[1], 'character', options), {});
  assert.deepEqual(normalizeCharacterMedia({ image: null }, 'character', options), {});
  assert.equal(normalizeCharacterMedia({ image }, 'character', options).display, 'avatar');
});

test('Notion JSON preserves exact role matching, alt text, storage path and display mode', () => {
  const serialized = serializeCharacterImages(characters, options);
  const parsed = parseCharacterImages(serialized, options);
  assert.deepEqual(parsed, { '貪婪魔女的親眷': { image, display: 'card' } });
  assert.deepEqual(getCharacterMedia(parsed, '貪婪魔女的親眷', options), parsed['貪婪魔女的親眷']);
  assert.equal(getCharacterMedia(parsed, '貪婪魔女', options), null);
  assert.equal(getCharacterMedia(parsed, 'toString', options), null);
  assert.deepEqual(parseCharacterImages(serializeCharacterImages([], options), options), {});
});

test('description-only roles and multiline descriptions survive the versioned Notion metadata', () => {
  const serialized = serializeCharacterImages(characters, options);
  const metadata = parseCharacterMetadata(serialized, options);
  assert.deepEqual(metadata.characterDescriptions, {
    '貪婪魔女的親眷': characters[0].description,
    '嫉妒魔女的親眷': characters[1].description,
  });
  assert.equal(JSON.parse(serialized).characters[1].name, '嫉妒魔女的親眷');
  assert.equal(JSON.parse(serialized).characters[1].image, undefined);
  assert.deepEqual(parseCharacterMetadata(serializeCharacterImages([{ name: '空白角色', description: '' }]), options), {
    characterImages: {}, characterDescriptions: {},
  });
  const legacy = JSON.stringify({ version: 1, characters: [{ name: '舊角色', image }] });
  assert.deepEqual(parseCharacterMetadata(legacy, options).characterDescriptions, {});
  assert.ok(parseCharacterMetadata(legacy, options).characterImages['舊角色']);
});

test('Notion current role names alone control which optional metadata can be applied', () => {
  const metadata = parseCharacterMetadata(serializeCharacterImages(characters, options), options);
  assert.deepEqual(matchCharacterMetadata(metadata, ['貪婪魔女的親眷']), {
    characterImages: { '貪婪魔女的親眷': { image, display: 'card' } },
    characterDescriptions: { '貪婪魔女的親眷': characters[0].description },
  });
  assert.deepEqual(matchCharacterMetadata(metadata, ['貪婪魔女的親眷新版', '貪婪魔女的親眷：新版']), {
    characterImages: {}, characterDescriptions: {},
  });
  assert.deepEqual(matchCharacterMetadata(metadata, []), { characterImages: {}, characterDescriptions: {} });
});

test('new images must exactly match the configured project, bucket and object path', () => {
  assert.equal(isSafeCharacterImageUrl(image.url, path, allowedBase), true);
  const invalidUrls = [
    'javascript:alert(1)', 'data:image/png;base64,test', '//evil.example/image.jpg',
    '/character-portraits/existing.jpg', image.url.replace('https:', 'http:'),
    image.url.replace('catalog-example.supabase.co', 'other-project.supabase.co'),
    image.url.replace('script-covers', 'private-bucket'),
    image.url.replace('catalog-example.supabase.co', 'catalog-example.supabase.co.evil.example'),
    image.url.replace('https://', 'https://someone@'), `${image.url}?download=1`, `${image.url}#test`,
    `${allowedBase}../${path}`, `${allowedBase}%2e%2e/${path}`,
  ];
  for (const url of invalidUrls) {
    assert.equal(isSafeCharacterImageUrl(url, path, allowedBase), false, url);
    assert.throws(() => normalizeCharacterMedia({ image: { ...image, url } }, 'character', options));
  }
  assert.equal(isSafeCharacterImageUrl(image.url, `../${path}`, allowedBase), false);
  assert.equal(isSafeCharacterImageUrl(image.url, path, ''), false);
  assert.equal(getCharacterImageStorageBase('http://localhost:8000'), '');
  assert.equal(getCharacterImageStorageBase(storageUrl, '../secret'), '');
  assert.throws(() => normalizeCharacterMedia({ image: { ...image, path: '' } }, 'character', options));
  assert.throws(() => normalizeCharacterMedia({ image: { ...image, unknown: true } }, 'character', options));
  assert.throws(() => normalizeCharacterMedia({ image, display: 'poster' }, 'character', options));
});

test('punctuation in role names or descriptions never changes the exact image association', () => {
  const media = { '角色：甲': { image, display: 'card' }, '角色': { image, display: 'avatar' } };
  assert.deepEqual(parseCharacterLabel('角色：甲', media), { name: '角色：甲', description: '' });
  assert.deepEqual(parseCharacterLabel('角色：甲｜簡介：含｜其他分隔符', media), {
    name: '角色：甲', description: '簡介：含｜其他分隔符',
  });
  assert.deepEqual(parseCharacterLabel('角色：甲：簡介｜原文', media), { name: '角色：甲', description: '簡介｜原文' });
  assert.deepEqual(parseCharacterLabel('既有角色：男：描述'), { name: '既有角色', description: '男：描述' });
  assert.deepEqual(parseCharacterLabel('新角色｜簡介'), { name: '新角色', description: '簡介' });
});

test('invalid public metadata safely falls back without swallowing other valid roles', () => {
  for (const value of ['', '{broken', 'null', '[]', '{"version":2,"characters":[]}', '{"version":1,"characters":{}}']) {
    assert.deepEqual(parseCharacterImages(value, options), {});
  }
  const invalidCharacter = { name: '嫉妒魔女的親眷', image: { ...image, url: 'https://evil.example/image.jpg' } };
  assert.deepEqual(characterImagesFromCharacters([characters[0], invalidCharacter], options), {
    '貪婪魔女的親眷': { image, display: 'card' },
  });
  assert.deepEqual(characterImagesFromCharacters([characters[0], characters[0]], options), {});
  assert.throws(() => serializeCharacterImages([characters[0], characters[0]], options), /不能重複/);
  assert.deepEqual(parseCharacterImages('x'.repeat(190001), options), {});
  const invalidImageWithValidText = { ...characters[0], image: { ...image, url: 'https://evil.example/image.jpg' } };
  assert.deepEqual(characterMetadataFromCharacters([invalidImageWithValidText], options), {
    characterImages: {}, characterDescriptions: { '貪婪魔女的親眷': characters[0].description },
  });
  assert.deepEqual(characterMetadataFromCharacters([{ name: '壞資料', description: { text: 'invalid' } }], options), {
    characterImages: {}, characterDescriptions: {},
  });
});

test('Notion missing media column is compatible with old records but cannot lose new images', () => {
  assert.deepEqual(buildNotionCharacterImagesProperty({}, [{ name: '舊角色', description: '' }], '角色圖片', options), {});
  assert.throws(() => buildNotionCharacterImagesProperty({}, [characters[1]], '角色圖片', options), /簡介/);
  assert.throws(() => buildNotionCharacterImagesProperty({}, characters, '角色圖片', options), /角色圖片/);
  assert.throws(() => buildNotionCharacterImagesProperty({ 角色圖片: { type: 'url' } }, characters, '角色圖片', options));
  const schema = { 角色圖片: { type: 'rich_text' } };
  const write = buildNotionCharacterImagesProperty(schema, characters, '角色圖片', options);
  const text = write.角色圖片.rich_text.map((entry) => entry.text.content).join('');
  assert.deepEqual(parseCharacterImages(text, options), { '貪婪魔女的親眷': { image, display: 'card' } });
  const cleared = buildNotionCharacterImagesProperty(schema, [], '角色圖片', options);
  assert.deepEqual(JSON.parse(cleared.角色圖片.rich_text[0].text.content), { version: 1, characters: [] });
  const custom = buildNotionCharacterImagesProperty({ Images: { type: 'rich_text' } }, characters, 'Images', options);
  assert.ok(custom.Images.rich_text.length);
});

test('Notion payload chunks large media lists without truncating the JSON', () => {
  const manyCharacters = Array.from({ length: 30 }, (_, index) => ({ ...characters[0], name: `角色 ${index}` }));
  const result = buildNotionCharacterImagesProperty({ 角色圖片: { type: 'rich_text' } }, manyCharacters, '角色圖片', options);
  assert.ok(result.角色圖片.rich_text.length > 1);
  assert.ok(result.角色圖片.rich_text.every((entry) => entry.text.content.length <= 1900));
  const text = result.角色圖片.rich_text.map((entry) => entry.text.content).join('');
  assert.equal(Object.keys(parseCharacterImages(text, options)).length, 30);
});

test('Supabase public mapper keeps legacy text and exposes the same optional media', () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousBucket = process.env.SCRIPT_COVERS_BUCKET;
  process.env.NEXT_PUBLIC_SUPABASE_URL = storageUrl;
  process.env.SCRIPT_COVERS_BUCKET = 'script-covers';
  try {
    const mapped = mapPublishedCatalogRow({ id: 'catalog-id', content: { name: '魔女論破', characters } });
    assert.equal(mapped.characters, '貪婪魔女的親眷\n嫉妒魔女的親眷');
    assert.deepEqual(mapped.characterImages, { '貪婪魔女的親眷': { image, display: 'card' } });
    assert.deepEqual(mapped.characterDescriptions, {
      '貪婪魔女的親眷': characters[0].description,
      '嫉妒魔女的親眷': characters[1].description,
    });
    assert.deepEqual(mapPublishedCatalogRow({ content: { characters: [characters[1]] } }).characterImages, {});
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousBucket === undefined) delete process.env.SCRIPT_COVERS_BUCKET;
    else process.env.SCRIPT_COVERS_BUCKET = previousBucket;
  }
});
