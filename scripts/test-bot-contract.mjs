import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BotContractError, botMediaPath, botRequestMetadata, imageBytesMatchType,
  normalizeBotMediaInput, publishedCatalogMatches, requireBotDraftOwnership,
  requireBotExpectedVersion, sameCharacterMedia, validateBotJobKey, validateBotJobState, validateBotPublishContent,
} from '../src/lib/script-admin/bot-contract.js';
import { publicScriptFingerprint } from '../src/lib/script-public-verification.js';

const version = '11111111-1111-4111-8111-111111111111';
const later = '22222222-2222-4222-8222-222222222222';
const requestId = 'line-job-123';
const digest = 'a'.repeat(64);
const headers = new Headers({ 'X-BGLARP-Request-Id': requestId, 'Idempotency-Key': 'draft:1' });

test('a retried logical operation has the same namespaced key; another job never shares it', () => {
  assert.deepEqual(botRequestMetadata(headers), botRequestMetadata(new Headers(headers)));
  assert.equal(botRequestMetadata(headers).idempotencyKey, 'bot:line-job-123:draft:1');
  const another = new Headers(headers);
  another.set('X-BGLARP-Request-Id', 'line-job-124');
  assert.notEqual(botRequestMetadata(headers).idempotencyKey, botRequestMetadata(another).idempotencyKey);
  for (const bad of ['', '../a', 'hello world', 'with:colon', 'a'.repeat(81)]) {
    const malformed = new Headers(headers);
    malformed.set('X-BGLARP-Request-Id', bad);
    assert.throws(() => botRequestMetadata(malformed), BotContractError);
  }
  assert.throws(() => botRequestMetadata(new Headers()), BotContractError);
});

test('stale or missing optimistic versions cannot overwrite a current draft', () => {
  assert.equal(requireBotExpectedVersion({ draftVersionId: version }, version), version);
  assert.throws(() => requireBotExpectedVersion({ draftVersionId: later }, version), { status: 409 });
  assert.throws(() => requireBotExpectedVersion({ draftVersionId: version }, undefined), { status: 400 });
});

test('only this job can continue an unpublished draft; a published baseline may start a new edit', () => {
  const draft = { status: 'draft', draftVersionId: version, publishedVersionId: null };
  assert.doesNotThrow(() => requireBotDraftOwnership(draft, { source: 'ai', idempotency_key: 'bot:line-job-123:draft:1' }, requestId));
  for (const alien of [
    { source: 'human', idempotency_key: 'bot:line-job-123:draft:1' },
    { source: 'ai', idempotency_key: 'bot:another-job:draft:1' },
    { source: 'ai', idempotency_key: 'bot:line-job-1234:draft:1' },
    { source: 'ai', idempotency_key: 'legacy-ai-key' },
  ]) assert.throws(() => requireBotDraftOwnership(draft, alien, requestId), { status: 409 });
  assert.doesNotThrow(() => requireBotDraftOwnership({ ...draft, status: 'published', publishedVersionId: version }, { source: 'human' }, requestId));
  assert.throws(() => requireBotDraftOwnership({ ...draft, status: 'published', publishedVersionId: later }, { source: 'human' }, requestId), { status: 409 });
});

test('media retry uses immutable content-addressed object paths and validates declared format', () => {
  const input = normalizeBotMediaInput({ kind: 'character', contentType: 'image/jpeg', size: 3000, sha256: digest });
  assert.equal(botMediaPath(requestId, input), `bot/${requestId}/character/${digest}.jpg`);
  assert.equal(botMediaPath(requestId, input), botMediaPath(requestId, { ...input }));
  assert.throws(() => normalizeBotMediaInput({ ...input, size: 9 * 1024 * 1024 }));
  assert.throws(() => normalizeBotMediaInput({ ...input, sha256: 'wrong' }));
  assert.throws(() => normalizeBotMediaInput({ ...input, kind: 'private' }));
  assert.throws(() => normalizeBotMediaInput({ ...input, contentType: 'image/svg+xml' }));
  assert.equal(imageBytesMatchType(Uint8Array.from([255, 216, 255, 224]), 'image/jpeg'), true);
  assert.equal(imageBytesMatchType(new TextEncoder().encode('<html>error</html>'), 'image/jpeg'), false);
  assert.equal(imageBytesMatchType(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'), true);
});

test('durable states permit metadata and cleared jobs, but reject credentials and image bytes', () => {
  assert.equal(validateBotJobKey(digest), digest);
  assert.throws(() => validateBotJobKey('../jobs'));
  assert.doesNotThrow(() => validateBotJobState({ rawText: '魔女論破 人數：7', images: [{ url: 'https://example.invalid/x.jpg', size: 3000 }] }, 2));
  assert.doesNotThrow(() => validateBotJobState(null, 3));
  assert.throws(() => validateBotJobState({}, -1));
  assert.throws(() => validateBotJobState([], 0));
  for (const state of [
    { nested: { replyToken: 'never-store' } }, { NOTION_TOKEN: 'never-store' },
    { password: 'never-store' }, { apiKey: 'never-store' },
    { image: 'data:image/jpeg;base64,AAAA' }, { imageBase64: 'AAAA' },
  ]) assert.throws(() => validateBotJobState(state, 0));
});

const coverUrl = 'https://example.supabase.co/storage/v1/object/public/script-covers/cover.jpg';
const roleUrl = 'https://example.supabase.co/storage/v1/object/public/script-covers/role.jpg';
const script = {
  notionPageId: 'notion-page', name: '魔女論破', synopsis: '簡介', playerMin: 7, playerMax: 7,
  durationLabel: '12～14小時', priceStatus: 'fixed', price: 2300,
  genres: ['推理'], customTags: ['台中獨家'], cover: { url: coverUrl },
  characters: [{ name: '貪婪魔女的親眷', description: '', image: { url: roleUrl }, display: 'card' }],
};
const publicScript = {
  scriptId: 'notion-page', name: '魔女論破', synopsis: '簡介', players: ['7人'],
  duration: '12～14小時', priceStatus: 'fixed', price: 2300, image: coverUrl,
  genre: ['推理', '台中獨家'], customTags: '台中獨家', characters: '貪婪魔女的親眷',
  characterImages: { '貪婪魔女的親眷': { image: { url: roleUrl }, display: 'card' } },
};

test('public completion requires matching Notion identity, content and all image metadata', () => {
  assert.equal(publishedCatalogMatches(script, publicScript), true);
  for (const patch of [
    { scriptId: 'another-page' }, { price: 230 }, { duration: '14小時' },
    { synopsis: 'stale' }, { image: 'https://example.invalid/old.jpg' },
    { players: ['6人'] }, { characters: '嫉妒魔女的親眷' },
    { customTags: '' }, { characterImages: {} },
    { genre: ['推理', '機制', '台中獨家'] },
    { characterImages: { '貪婪魔女的親眷': { image: { url: roleUrl }, display: 'avatar' } } },
  ]) assert.equal(publishedCatalogMatches(script, { ...publicScript, ...patch }), false, JSON.stringify(patch));
  assert.equal(publishedCatalogMatches(script, undefined), false);
});

test('removed portraits, stale image captions and paths must not be reported as published', () => {
  assert.equal(publishedCatalogMatches({ ...script, characters: [{ name: '貪婪魔女的親眷', description: '' }] }, publicScript), false);
  assert.equal(publishedCatalogMatches(script, { ...publicScript, characterImages: {
    '貪婪魔女的親眷': { image: { url: roleUrl, alt: 'old caption' }, display: 'card' },
  } }), false);
  assert.equal(publishedCatalogMatches(script, { ...publicScript, characterImages: {
    '貪婪魔女的親眷': { image: { url: roleUrl, path: 'wrong.jpg' }, display: 'card' },
  } }), false);
});

test('multiline descriptions are preserved and missing descriptions never pass', () => {
  const described = { ...script, characters: [{ ...script.characters[0], description: '第一行\n第二行' }] };
  assert.equal(publishedCatalogMatches(described, publicScript), false);
  assert.equal(publishedCatalogMatches(described, { ...publicScript, characters: '貪婪魔女的親眷｜第一行\n第二行' }), true);
  assert.equal(publishedCatalogMatches(described, { ...publicScript, characterDescriptions: { '貪婪魔女的親眷': '第一行\n第二行' } }), true);
});

test('the rendered detail fingerprint detects stale visible content despite matching covers', () => {
  assert.equal(publicScriptFingerprint(publicScript), publicScriptFingerprint({ ...publicScript }));
  for (const patch of [{ price: 230 }, { synopsis: 'old' }, { characters: '舊角色' }, { characterDescriptions: { test: 'old' } }]) {
    assert.notEqual(publicScriptFingerprint(publicScript), publicScriptFingerprint({ ...publicScript, ...patch }));
  }
});

test('bot publishing rejects missing genres, duplicate roles and inconsistent player counts', () => {
  const complete = { ...script, playerMin: 1, playerMax: 1 };
  assert.doesNotThrow(() => validateBotPublishContent(complete));
  assert.doesNotThrow(() => validateBotPublishContent({ ...complete, characters: [] }));
  assert.throws(() => validateBotPublishContent(script));
  assert.throws(() => validateBotPublishContent({ ...complete, genres: [] }));
  assert.throws(() => validateBotPublishContent({ ...complete, playerMax: 2, characters: [...script.characters, ...script.characters] }));
  assert.throws(() => validateBotPublishContent({ ...complete, characters: [{ name: '角色甲\n角色乙' }] }));
});

test('an unchanged legacy role reference is distinct from a new or altered external image', () => {
  const previous = { name: '角色甲', image: { url: 'https://legacy.invalid/a.jpg', path: '', alt: '原圖' }, display: 'card' };
  assert.equal(sameCharacterMedia(previous, structuredClone(previous)), true);
  for (const patch of [{ name: '角色乙' }, { display: 'avatar' }, { image: { ...previous.image, alt: '不同alt' } }, { image: { ...previous.image, url: 'https://other.invalid/a.jpg' } }]) {
    assert.equal(sameCharacterMedia(previous, { ...previous, ...patch }), false);
  }
});
