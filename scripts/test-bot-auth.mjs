import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('publishing token and existing draft-only AI token are independent credentials', async () => {
  const source = readFileSync(new URL('../src/lib/script-admin/auth.js', import.meta.url), 'utf8');
  const previousAi = process.env.SCRIPT_ADMIN_AI_TOKEN;
  const previousBot = process.env.SCRIPT_ADMIN_BOT_TOKEN;
  process.env.SCRIPT_ADMIN_AI_TOKEN = 'offline-test-ai-draft-token';
  process.env.SCRIPT_ADMIN_BOT_TOKEN = 'offline-test-bot-publication-token';
  const safeError = (status) => () => Object.assign(new Error('test authorization failure'), { status });
  globalThis.__offlineBotAuth = {
    '@/lib/supabase/server': { createSupabaseAdminClient: () => ({ offline: true }) },
    './constants': {},
    './errors': { unauthenticated: safeError(401), unavailable: safeError(503) },
  };
  const injected = source.replace(/import\s+([\s\S]*?)\s+from\s+(['"])([^'"]+)\2;/g, (all, names, _quote, specifier) => (
    specifier.startsWith('node:') ? all : `const ${names} = globalThis.__offlineBotAuth[${JSON.stringify(specifier)}];`
  ));
  const request = (token) => ({ headers: new Headers(token ? { Authorization: `Bearer ${token}` } : {}) });
  try {
    const { requireScriptAi, requireScriptBot } = await import(`data:text/javascript;base64,${Buffer.from(injected).toString('base64')}`);
    assert.equal(requireScriptBot(request(process.env.SCRIPT_ADMIN_BOT_TOKEN)).actor.role, 'bot');
    assert.throws(() => requireScriptBot(request(process.env.SCRIPT_ADMIN_AI_TOKEN)), { status: 401 });
    assert.throws(() => requireScriptBot(request(null)), { status: 401 });
    assert.equal(requireScriptAi(request(process.env.SCRIPT_ADMIN_AI_TOKEN)).actor.role, 'ai');
    assert.throws(() => requireScriptAi(request(process.env.SCRIPT_ADMIN_BOT_TOKEN)), { status: 401 });
    delete process.env.SCRIPT_ADMIN_BOT_TOKEN;
    assert.throws(() => requireScriptBot(request('any-value')), { status: 503 });
  } finally {
    delete globalThis.__offlineBotAuth;
    if (previousAi === undefined) delete process.env.SCRIPT_ADMIN_AI_TOKEN;
    else process.env.SCRIPT_ADMIN_AI_TOKEN = previousAi;
    if (previousBot === undefined) delete process.env.SCRIPT_ADMIN_BOT_TOKEN;
    else process.env.SCRIPT_ADMIN_BOT_TOKEN = previousBot;
  }
});
