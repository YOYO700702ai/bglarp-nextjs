// One-use loopback form for moving an existing Notion credential into the
// ignored migration environment without exposing it in chat or command args.
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const file = '.env.production.local';
execFileSync('git', ['check-ignore', '--quiet', file]);
const path = '/' + randomBytes(24).toString('hex');
const origin = 'http://127.0.0.1:4193';
let used = false;
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.headers.host !== '127.0.0.1:4193' || req.url !== path || used) { res.writeHead(404).end('Not found'); return; }
  if (req.method === 'GET') {
    res.end('<h1>本機搬遷設定</h1><p>只儲存既有 Notion 權杖到本機忽略的環境檔，不修改 Notion。</p><form method="post"><label>Notion 權杖<input type="password" name="token" autocomplete="off" required></label><button>儲存至本機</button></form>');
    return;
  }
  if (req.method !== 'POST' || req.headers.origin !== origin) { res.writeHead(403).end('Forbidden'); return; }
  let data = '';
  for await (const chunk of req) { data += chunk; if (data.length > 4096) { res.writeHead(413).end('Too large'); return; } }
  const token = new URLSearchParams(data).get('token') || '';
  if (!/^(ntn_|secret_)[A-Za-z0-9_-]{20,}$/.test(token)) { res.writeHead(400).end('Invalid token format'); return; }
  const content = readFileSync(file, 'utf8');
  if (!/^NOTION_TOKEN=.*$/m.test(content)) { res.writeHead(409).end('Missing destination'); return; }
  writeFileSync(file, content.replace(/^NOTION_TOKEN=.*$/m, 'NOTION_TOKEN=' + JSON.stringify(token)).replace(/^SCRIPT_CATALOG_SOURCE=.*$/m, 'SCRIPT_CATALOG_SOURCE="notion"'), { mode: 0o600 });
  used = true;
  res.end('<h1>已安全儲存</h1><p>權杖未顯示，未修改 Notion 或資料庫。</p>');
  console.log('Existing Notion token saved to ignored migration config; value not logged.');
  server.close();
});
server.listen(4193, '127.0.0.1', () => console.log(origin + path));
setTimeout(() => server.close(), 10 * 60 * 1000).unref();
