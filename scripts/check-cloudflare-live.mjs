import assert from 'node:assert/strict';
const origin='https://www.bglarp.com';
for(const path of ['/','/scripts','/guide','/team-building','/taichung/booking','/admin/scripts','/sitemap.xml','/robots.txt','/scripts/'+encodeURIComponent('聲聲慢2:此生不換')]) {
  const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000),redirect:'manual'});
  assert.equal(r.status,path==='/scripts'?308:200,path);
  if(path==='/scripts') assert.equal(r.headers.get('location'),'/#scripts');
  assert.equal(r.headers.get('server'),'cloudflare',path);
  assert.equal(r.headers.get('x-vercel-id'),null,path);
  await r.arrayBuffer();
  console.log(`PASS Cloudflare ${path}`);
}
const root=await fetch('https://bglarp.com/scripts?utm_source=migration&gclid=preserved',{redirect:'manual'});
assert.equal(root.status,308);
assert.equal(root.headers.get('location'),origin+'/scripts?utm_source=migration&gclid=preserved');
console.log('PASS apex redirect preserves path and ad query');
const scripts=await (await fetch(origin+'/api/scripts')).json();
assert.equal(scripts.length,136);
console.log('PASS 136 public scripts');
const html=await (await fetch(origin+'/')).text();
const assets=[...new Set([...html.matchAll(/(?:src|href)="([^" ]+)"/g)].map(m=>m[1]).filter(p=>p.startsWith('/_next/static/')))];
assert.ok(assets.length>0);
for(const path of assets) {
  const r=await fetch(origin+path,{signal:AbortSignal.timeout(20000)});
  assert.equal(r.status,200,path);
  assert.ok((await r.arrayBuffer()).byteLength>0);
}
console.log(`PASS ${assets.length} homepage JS/CSS assets`);
const auth=await fetch(origin+'/auth/callback?next=https://untrusted.invalid/',{redirect:'manual'});
assert.equal(auth.status,307);
assert.equal(new URL(auth.headers.get('location')).origin,origin);
assert.match(auth.headers.get('cache-control'),/no-store/);
console.log('PASS auth callback rejects external redirect, remains no-store');
