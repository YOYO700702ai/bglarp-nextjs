import assert from 'node:assert/strict';
const original = 'https://www.bglarp.com';
const candidate = 'https://bglarp-site.hankvictor1023.workers.dev';
async function get(origin,path) {
  const response = await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,origin+path);
  return response;
}
const [oldData,newData] = await Promise.all([original,candidate].map(async origin => (await get(origin,'/api/scripts')).json()));
assert.deepEqual(newData,oldData,'Public catalogue must match completely');
console.log(`PASS public catalogue exact parity (${Array.isArray(newData) ? newData.length : 'object'} records)`);
for(const path of ['/','/scripts','/taichung/booking','/team-building','/sitemap.xml','/robots.txt','/scripts/'+encodeURIComponent('塑料溫室'),'/scripts/'+encodeURIComponent('聲聲慢2:此生不換')]) {
  const [a,b] = await Promise.all([original,candidate].map(async origin => (await get(origin,path)).text()));
  if(path.endsWith('.xml') || path.endsWith('.txt')) assert.equal(b,a,`${path}: SEO body parity`);
  else {
    for(const pattern of [/<title>(.*?)<\/title>/, /<link rel="canonical" href="([^"]+)"/]) {
      assert.equal(b.match(pattern)?.[1],a.match(pattern)?.[1],`${path}: metadata parity`);
    }
  }
  console.log(`PASS ${path}: 200 + metadata / SEO parity`);
}
for(const path of ['/api/admin/scripts','/api/admin/scripts/cover-upload']) {
  const r = await fetch(candidate+path,{signal:AbortSignal.timeout(10000)});
  assert.ok([401,405].includes(r.status),`${path} must reject anonymous access`);
  console.log(`PASS ${path}: anonymous ${r.status}`);
}
