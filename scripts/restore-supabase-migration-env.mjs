// Recover existing project keys through the authenticated Supabase CLI.
// Never prints values, rotates keys, changes databases, or uploads anything.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const mode = process.argv[2];
const targets = {
  bglarp: { ref: 'rnipzotldpbdlzxjnoip', dir: process.cwd(), urlKey: 'NEXT_PUBLIC_SUPABASE_URL', publicKey: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY' },
  classroom: { ref: 'zyfogeuypgzomdksggut', dir: 'C:/Users/user/Desktop/班級經營用的寵物養成系統-cloudflare-migration-20260921/app', urlKey: 'VITE_SUPABASE_URL', publicKey: 'VITE_SUPABASE_ANON_KEY' },
};
const target = targets[mode];
if (!target) throw new Error('Choose bglarp or classroom');
const file = resolve(target.dir, '.env.production.local');
const ignored = spawnSync('git', ['check-ignore', file], { cwd: target.dir, encoding: 'utf8' });
if (ignored.status !== 0) throw new Error('Refusing to write unignored environment file');
const result = spawnSync('cmd.exe', ['/d', '/s', '/c', `npx.cmd --yes supabase projects api-keys --project-ref ${target.ref} --reveal --output json`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if (result.status !== 0) throw new Error('Supabase CLI failed; output suppressed to protect credentials');
let keys;
try { keys = JSON.parse(result.stdout); } catch { throw new Error('Unexpected CLI response; suppressed'); }
if (!Array.isArray(keys)) throw new Error('Unexpected keys structure');
const usable = key => typeof key === 'string' && key.length > 30 && !/\*|SENSITIVE/.test(key);
const anon = keys.find(k => k.name === 'anon')?.api_key;
const pub = mode === 'classroom' ? anon : keys.find(k => k.type === 'publishable')?.api_key || anon;
const service = keys.find(k => k.name === 'service_role')?.api_key;
if (!usable(pub) || !usable(service)) throw new Error('Required existing keys are unavailable');
const env = {};
for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && !/^(VERCEL|TURBO|NX_)/.test(match[1])) env[match[1]] = match[2];
}
env[target.urlKey] = JSON.stringify(`https://${target.ref}.supabase.co`);
env[target.publicKey] = JSON.stringify(pub);
env.SUPABASE_SERVICE_ROLE_KEY = JSON.stringify(service);
if (mode === 'classroom') env.SUPABASE_URL = env[target.urlKey];
writeFileSync(file, '# Local migration configuration. Never commit.\n' + Object.entries(env).map(([k,v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
console.log(`${mode}: existing Supabase settings restored to git-ignored local environment; no values printed.`);
console.log('Still unresolved: ' + Object.entries(env).filter(([,v]) => v.includes('[SENSITIVE]')).map(([k]) => k).join(', '));
