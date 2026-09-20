// New host only: retain the same AI draft-only permissions; never rotate Notion,
// Supabase, LINE, or the still-live Vercel credential. No catalogue mutation.
import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const file = '.env.production.local';
const ignored = spawnSync('git',['check-ignore','--quiet',file]);
if (ignored.status !== 0) throw new Error('Environment file must be ignored');
let content = readFileSync(file,'utf8');
const match = content.match(/^SCRIPT_ADMIN_AI_TOKEN=(.*)$/m);
if (!match) throw new Error('Missing expected AI configuration');
let key;
if (match[1].includes('[SENSITIVE]')) {
  key = randomBytes(48).toString('base64url');
  content = content.replace(/^SCRIPT_ADMIN_AI_TOKEN=.*$/m,'SCRIPT_ADMIN_AI_TOKEN='+JSON.stringify(key));
  writeFileSync(file,content,{mode:0o600});
} else key = JSON.parse(match[1]);
const result = spawnSync('cmd.exe',['/d','/s','/c','npx.cmd wrangler secret bulk'],{
  encoding:'utf8', input:JSON.stringify({SCRIPT_ADMIN_AI_TOKEN:key}), env:{...process.env,CI:'true'},
});
console.log(((result.stdout||'')+(result.stderr||'')).split(key).join('[redacted]'));
if(result.status!==0) throw new Error('Could not configure candidate AI credential');
console.log('New-host AI draft credential saved locally (ignored) and as Cloudflare secret. Update authorized clients to this key at cutover.');
