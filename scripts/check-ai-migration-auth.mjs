import { loadEnvFile } from 'node:process';
import assert from 'node:assert/strict';
loadEnvFile('.env.production.local');
const origin = process.argv[2] || 'https://bglarp-site.hankvictor1023.workers.dev';
assert.ok(['https://bglarp-site.hankvictor1023.workers.dev','https://www.bglarp.com'].includes(origin));
// Invalid JSON is rejected immediately after authentication, before any write.
for (const [authorized, expected] of [[false,401],[true,400]]) {
  const response = await fetch(origin+'/api/admin/scripts/ai',{
    method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(authorized?{Authorization:`Bearer ${process.env.SCRIPT_ADMIN_AI_TOKEN}`}:{})},
    body:'{',signal:AbortSignal.timeout(15000),
  });
  assert.equal(response.status,expected);
  console.log(`PASS ${authorized?'new host AI credential accepted; malformed body rejected before writes':'anonymous AI request rejected'}: ${expected}`);
}
