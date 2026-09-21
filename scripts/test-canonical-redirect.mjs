import assert from 'node:assert/strict';
import {canonicalRedirect} from '../src/lib/canonicalRedirect.js';
for(const suffix of ['/', '/scripts?utm_source=ads&gclid=abc', '/scripts/%E8%81%B2%E8%81%B2%E6%85%A22%3A%E6%AD%A4%E7%94%9F%E4%B8%8D%E6%8F%9B']) {
  const r=canonicalRedirect(new Request('https://bglarp.com'+suffix));
  assert.equal(r.status,308);
  assert.equal(r.headers.get('Location'),'https://www.bglarp.com'+suffix);
  assert.equal(canonicalRedirect(new Request('https://www.bglarp.com'+suffix)),null);
}
assert.equal(canonicalRedirect(new Request('https://bglarp-site.hankvictor1023.workers.dev/')),null);
console.log('PASS exact apex redirect, query/encoded path preservation and no www/candidate loops');
