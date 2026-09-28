import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Read-only verification: fetched pages never execute browser JavaScript. The
// only POST has an invalid Origin and must be rejected before storage access.
// Usage: node scripts/check-site-analytics-live.mjs [--origin URL]
//   [--baseline catalogue.json] [--output verification.json]
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!['--origin', '--baseline', '--output'].includes(key) || !value) {
    throw new Error(`Unsupported or incomplete option: ${key}`);
  }
  options[key.slice(2)] = value;
}
const origin = new URL(options.origin || 'https://www.bglarp.com').origin;
const checks = [];
const pages = new Map();
const assets = new Set();
let catalogueCount;
let catalogueHash;

async function check(name, task) {
  try {
    const detail = await task();
    checks.push({ name, passed: true, ...detail });
    console.log(`PASS ${name}`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error.message || error) });
    console.error(`FAIL ${name}: ${error.message || error}`);
  }
}

function get(route, init = {}) {
  return fetch(new URL(route, origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    ...init,
  });
}

const publicPages = [
  '/', '/guide', '/team-building', '/taichung/booking',
  '/hanmen-quiz', '/evil-flower-quiz', '/qiuji-quiz',
  '/scripts/' + encodeURIComponent('聲聲慢2:此生不換'),
  '/admin/scripts', '/admin/analytics',
];
await Promise.all(publicPages.map((route) => check(`HTML ${route}`, async () => {
  const response = await get(route);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/html/);
  assert.equal(response.headers.get('server'), 'cloudflare');
  assert.equal(response.headers.get('x-vercel-id'), null);
  const html = await response.text();
  assert.ok(html.length > 0);
  pages.set(route, html);
  for (const match of html.matchAll(/(?:src|href)="([^" ]+)"/g)) {
    if (/^\/_next\/static\/.*\.(?:js|css)(?:\?|$)/.test(match[1])) assets.add(match[1]);
  }
  return { route, status: response.status, bytes: Buffer.byteLength(html) };
})));

await check('Homepage retains October campaign, member announcement and GTM', async () => {
  const html = pages.get('/');
  assert.ok(html, 'Homepage was unavailable');
  assert.ok(html.includes('chungyo-halloween-2026.webp'), 'October artwork missing');
  assert.ok(html.includes('中友百貨'), 'Chungyo campaign missing');
  assert.ok(html.includes('NT$100'), 'October discount missing');
  assert.ok(html.includes('new-member-activity-title'), 'Existing membership campaign missing');
  assert.ok(html.includes('https://liff.line.me/2011124107-GVTDMium'), 'Membership card link missing');
  assert.ok(html.includes('GTM-W4V4NWRJ'), 'Existing GTM container missing');
  assert.ok(html.indexOf('chungyo-halloween-2026.webp') < html.indexOf('new-member-activity-title'), 'October campaign is not before membership campaign');
  return { october: true, membership: true, gtm: 'GTM-W4V4NWRJ' };
});

await check('Public catalogue and optional complete baseline comparison', async () => {
  const response = await get('/api/scripts');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  const catalogue = await response.json();
  assert.ok(Array.isArray(catalogue) && catalogue.length > 0, 'Catalogue must be a non-empty array');
  catalogueCount = catalogue.length;
  catalogueHash = createHash('sha256').update(JSON.stringify(catalogue)).digest('hex');
  if (options.baseline) {
    const baseline = JSON.parse(await readFile(options.baseline, 'utf8'));
    assert.deepEqual(catalogue, baseline, 'Catalogue differs from supplied baseline');
  }
  return { route: '/api/scripts', status: response.status, count: catalogueCount, sha256: catalogueHash, baselineCompared: Boolean(options.baseline) };
});

await check('Analytics data rejects unauthenticated access without caching', async () => {
  const response = await get('/api/admin/analytics?days=7');
  assert.equal(response.status, 401);
  const cacheControl = response.headers.get('cache-control') || '';
  assert.match(cacheControl, /private/);
  assert.match(cacheControl, /no-store/);
  const body = await response.json();
  assert.equal(body.code, 'unauthenticated');
  assert.equal(body.summary, undefined);
  return { route: '/api/admin/analytics?days=7', status: response.status, cacheControl };
});

await check('Collector GET is read-disabled and not cached', async () => {
  const response = await get('/api/analytics/collect');
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal((await response.json()).error, 'method_not_allowed');
  return { route: '/api/analytics/collect', status: response.status };
});

await check('Collector rejects bad Origin before accepting any event', async () => {
  const response = await get('/api/analytics/collect', {
    method: 'POST',
    headers: { Origin: 'https://untrusted.invalid', 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.status, 403);
  assert.match(response.headers.get('cache-control') || '', /no-store/);
  assert.equal((await response.json()).error, 'forbidden');
  return { route: '/api/analytics/collect', status: response.status, containsEvents: false };
});

await check('Discovered JS/CSS assets return nonempty HTTP 200', async () => {
  assert.ok(assets.size > 0, 'No JS/CSS assets discovered');
  const routes = [...assets].sort();
  const verified = [];
  // Bounded batches avoid flooding the deployed origin during QA.
  for (let index = 0; index < routes.length; index += 6) {
    const batch = await Promise.allSettled(routes.slice(index, index + 6).map(async (route) => {
      const response = await get(route);
      assert.equal(response.status, 200, route);
      const bytes = (await response.arrayBuffer()).byteLength;
      assert.ok(bytes > 0, route);
      return { route, status: response.status, bytes };
    }));
    for (const result of batch) {
      if (result.status === 'rejected') throw result.reason;
      verified.push(result.value);
    }
  }
  return { count: verified.length, assets: verified };
});

const result = {
  verifiedAt: new Date().toISOString(),
  origin,
  browserJavaScriptExecuted: false,
  validEventPosts: 0,
  catalogueCount,
  catalogueSha256: catalogueHash,
  passed: checks.every((item) => item.passed),
  checks,
};
if (options.output) {
  await mkdir(path.dirname(path.resolve(options.output)), { recursive: true });
  await writeFile(options.output, JSON.stringify(result, null, 2) + '\n');
}
console.log(`${result.passed ? 'PASS' : 'FAIL'} ${checks.filter((item) => item.passed).length}/${checks.length} checks; ${catalogueCount ?? '?'} public scripts; ${assets.size} assets`);
if (!result.passed) process.exitCode = 1;
