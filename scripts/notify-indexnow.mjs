import { getAllScripts } from '../src/lib/scripts.js';

const KEY = '892947c5a99d32369902fc100474ca26';
const HOST = 'www.bglarp.com';
const BASE = `https://${HOST}`;

async function main() {
    const scripts = await getAllScripts();
    const urls = [
        BASE,
        ...scripts.map(s => `${BASE}/scripts/${encodeURIComponent(s.name)}`),
    ];

    const payload = {
        host: HOST,
        key: KEY,
        keyLocation: `${BASE}/${KEY}.txt`,
        urlList: urls,
    };

    console.log(`Submitting ${urls.length} URLs to IndexNow...`);

    const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
    });

    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text) console.log(`Body: ${text}`);

    if (res.status === 200 || res.status === 202) {
        console.log('Success — Bing/Yandex/Seznam/Naver should pick up the URLs within minutes.');
    } else {
        console.error('Failed. Common causes: invalid key, key file not at keyLocation, host mismatch.');
        process.exit(1);
    }
}

main().catch(e => { console.error(e); process.exit(1); });
