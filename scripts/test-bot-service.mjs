import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as contract from '../src/lib/script-admin/bot-contract.js';
import { publicScriptFingerprint } from '../src/lib/script-public-verification.js';

// Inject boundary dependencies while executing the real service functions.
// Tests do not create clients, contact production or read local credentials.
const source = readFileSync(new URL('../src/lib/script-admin/bot.js', import.meta.url), 'utf8');
let instance = 0;
async function serviceWith(stubs = {}) {
  const key = `__botServiceTest${++instance}`;
  const error = (message) => Object.assign(new Error(message), { status: 409 });
  globalThis[key] = {
    '@/lib/scripts': { getAllScriptsFromNotion: async () => [] },
    '@/lib/script-public-verification': { publicScriptFingerprint },
    '@/lib/characterMedia': { getCharacterImageStorageBase: () => 'https://example.invalid/' },
    './auth': {}, './constants': { SCRIPT_TABLE: 'scripts', SCRIPT_VERSION_TABLE: 'versions' },
    './errors': { conflict: error, invalidRequest: error, databaseError: error, notFound: error, unavailable: error },
    './http': {}, './revalidate': { revalidatePublishedScript() {} },
    './service': {},
    './validation': {
      extractScriptContentInput: (body) => body.content,
      normalizeScriptContent: (content) => structuredClone(content),
      mergeScriptContent: (base, patch) => ({ ...base, ...patch }),
      requireUuid: (id) => id,
      slugifyScriptName: (name) => name,
    },
    './bot-contract': contract,
    ...stubs,
  };
  const injected = source.replace(/import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2;/g, (all, names, _quote, specifier) => (
    specifier.startsWith('node:') ? all : `const ${names} = globalThis[${JSON.stringify(key)}][${JSON.stringify(specifier)}];`
  ));
  try { return await import(`data:text/javascript;base64,${Buffer.from(injected).toString('base64')}`); }
  finally { delete globalThis[key]; }
}

function versionClient(versions) {
  return { from(table) {
    assert.equal(table, 'versions');
    return { select() { return { eq(field, value) { return {
      async maybeSingle() { return { data: versions.find((version) => version[field] === value) || null, error: null }; },
    }; } }; } };
  } };
}

const oldVersion = '11111111-1111-4111-8111-111111111111';
const operationVersion = '22222222-2222-4222-8222-222222222222';
const laterVersion = '33333333-3333-4333-8333-333333333333';
const key = 'bot:job-1:patch-1';

test('PATCH retry returns the original operation version, never a later staff draft', async () => {
  const base = { name: '魔女論破', synopsis: 'old' };
  const saved = { ...base, synopsis: 'requested' };
  const versions = [
    { id: oldVersion, script_id: 'script-1', content: base },
    { id: operationVersion, script_id: 'script-1', content: saved, idempotency_key: key },
  ];
  const current = { id: 'script-1', name: '魔女論破', draftVersionId: laterVersion, synopsis: 'later staff edit' };
  const service = await serviceWith({ './service': { getCatalogScript: async () => current } });
  const result = await service.patchBotDraft({ adminClient: versionClient(versions), requestId: 'job-1', idempotencyKey: key }, 'script-1', {
    expectedVersionId: oldVersion, content: { synopsis: 'requested' },
  });
  assert.equal(result.operationVersionId, operationVersion);
  assert.equal(result.script.draftVersionId, laterVersion);
  assert.equal(result.idempotentReplay, true);
  await assert.rejects(() => service.patchBotDraft({ adminClient: versionClient(versions), requestId: 'job-1', idempotencyKey: key }, 'script-1', {
    expectedVersionId: oldVersion, content: { synopsis: 'different request under reused key' },
  }), /不同內容/);
});

test('POST retry also exposes its own immutable version rather than the current pointer', async () => {
  const version = { id: operationVersion, script_id: 'script-1', idempotency_key: key };
  const service = await serviceWith({ './service': {
    createDraftScript: async () => ({ script: { draftVersionId: laterVersion }, idempotentReplay: true }),
  } });
  const result = await service.createBotDraft({ adminClient: versionClient([version]), idempotencyKey: key }, { content: { name: '魔女論破' } });
  assert.equal(result.operationVersionId, operationVersion);
  assert.equal(result.script.draftVersionId, laterVersion);
});

test('PATCH replay compares JSON values independently of nested image property order', async () => {
  const image = { url: 'https://example.invalid/role.jpg', path: 'role.jpg', alt: '' };
  const base = { name: '魔女論破', characters: [] };
  const intendedCharacters = [{ name: '角色甲', image, display: 'avatar' }];
  const saved = { name: '魔女論破', characters: [{ name: '角色甲', display: 'avatar', image }] };
  const versions = [
    { id: oldVersion, script_id: 'script-1', content: base },
    { id: operationVersion, script_id: 'script-1', content: saved, idempotency_key: key },
  ];
  const service = await serviceWith({ './service': { getCatalogScript: async () => ({ id: 'script-1', name: '魔女論破' }) } });
  const result = await service.patchBotDraft({ adminClient: versionClient(versions), requestId: 'job-1', idempotencyKey: key }, 'script-1', {
    expectedVersionId: oldVersion, content: { characters: intendedCharacters },
  });
  assert.equal(result.operationVersionId, operationVersion);
});

test('unrelated staff drafts cannot be published through the bot even with a valid latest version', async () => {
  const draft = { id: 'script-1', status: 'draft', draftVersionId: oldVersion, publishedVersionId: null };
  const service = await serviceWith({ './service': { getCatalogScript: async () => draft } });
  await assert.rejects(() => service.publishBotScript({
    adminClient: versionClient([{ id: oldVersion, source: 'human' }]), requestId: 'job-1',
  }, 'script-1', { expectedVersionId: oldVersion }), /原編輯者/);
});

test('a synced catalog row is not live until the actual detail fingerprint agrees', async () => {
  const service = await serviceWith();
  const script = {
    id: 'script-1', publishedVersionId: oldVersion, status: 'published', syncStatus: 'synced',
    notionPageId: 'notion-1', name: '測試劇本', synopsis: '簡介', durationLabel: '2小時',
    playerMin: 1, playerMax: 1, priceStatus: 'fixed', price: 500, genres: ['推理'], customTags: [],
    cover: { url: 'https://example.invalid/cover.jpg' }, characters: [{ name: '角色甲', description: '' }],
  };
  const row = {
    scriptId: 'notion-1', name: script.name, synopsis: script.synopsis, duration: '2小時', players: ['1人'],
    priceStatus: 'fixed', price: 500, genre: ['推理'], customTags: '', image: script.cover.url, characters: '角色甲',
  };
  const originalFetch = globalThis.fetch;
  const originalOrigin = process.env.SCRIPT_PUBLIC_ORIGIN;
  process.env.SCRIPT_PUBLIC_ORIGIN = 'https://www.bglarp.com';
  let renderedRow = { ...row, price: 50 };
  let mediaStatus = 200;
  globalThis.fetch = async (url, options) => {
    if (options?.method === 'HEAD') return { status: mediaStatus, headers: new Headers({ 'Content-Type': 'image/jpeg' }) };
    return url.includes('/api/scripts')
      ? { ok: true, json: async () => [row] }
      : { ok: true, url, text: async () => `<div data-bgl-script-fingerprint="${publicScriptFingerprint(renderedRow)}">${script.name}<img src="${script.cover.url}"></div>` };
  };
  try {
    assert.equal((await service.verifyBotPublication(script)).state, 'verification_pending');
    renderedRow = row;
    assert.equal((await service.verifyBotPublication(script)).state, 'live');
    mediaStatus = 403;
    assert.equal((await service.verifyBotPublication(script)).state, 'verification_pending');
    assert.equal((await service.verifyBotPublication({ ...script, syncStatus: 'error' })).state, 'sync_pending');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalOrigin === undefined) delete process.env.SCRIPT_PUBLIC_ORIGIN;
    else process.env.SCRIPT_PUBLIC_ORIGIN = originalOrigin;
  }
});
