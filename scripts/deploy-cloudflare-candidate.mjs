import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
loadEnvFile('.env.production.local');
const required = ['DATABASE_ID','NOTION_TOKEN','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY','SCRIPT_CATALOG_SOURCE'];
for (const name of required) {
  if (!process.env[name] || /SENSITIVE|\*{4}/.test(process.env[name])) throw new Error(`Unresolved: ${name}`);
}
const config = JSON.parse(readFileSync('wrangler.jsonc','utf8'));
const publish = process.argv.includes('--production');
const expectedRoutes = ['www.bglarp.com/*','bglarp.com/*'];
if (config.name !== 'bglarp-site' || config.route ||
    (config.routes && (!publish || config.routes.length !== 2 || config.routes.some(r=>!expectedRoutes.includes(r.pattern)||r.zone_name!=='bglarp.com')))) {
  throw new Error('Use --production only for the two verified BGLARP host routes');
}
if (process.env.SCRIPT_CATALOG_SOURCE !== 'notion') throw new Error('Preserve original Notion source');
const secrets = Object.fromEntries(required.map(k => [k,process.env[k]]));
for (const name of ['SCRIPT_ADMIN_AI_TOKEN','FORUM_SYNC_SECRET']) {
  if (process.env[name]?.includes('[SENSITIVE]')) process.env[name] = '';
  if (process.env[name]) secrets[name] = process.env[name];
}
function run(command, input) {
  const result = spawnSync('cmd.exe',['/d','/s','/c',command],{encoding:'utf8',input,maxBuffer:16*1024*1024,env:{...process.env,CI:'true'}});
  let output = (result.stdout || '') + (result.stderr || '');
  for (const value of Object.values(secrets)) output = output.split(value).join('[redacted]');
  console.log(output);
  if(result.status !== 0) throw new Error('Candidate step failed');
}
run('npm.cmd run build:cloudflare');
run('npm.cmd run deploy:cloudflare');
run('npx.cmd wrangler secret bulk', JSON.stringify(secrets));
console.log('Deployed with restored Notion/Supabase credentials and Cloudflare-only AI draft key. Verify live routes; FORUM_SYNC_SECRET is not used in this production source.');
