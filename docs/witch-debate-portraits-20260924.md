# 魔女論破角色圖發布

- Published to https://www.bglarp.com/scripts/魔女論破 on 2026-09-24.
- Cloudflare Worker: `bglarp-site`, version `a8a60fd4-2b33-4232-b988-31d344cb80d0`.
- Added seven owner-supplied, unmodified 1080 × 1515 JPEGs in `public/character-portraits/witch-debate-20260924/`.
- This script displays complete cards in two mobile columns / three desktop columns. Each card links to the original image in a new tab. Other script layouts retain their existing portraits.
- Notion catalogue, cover, prices, synopsis and role names were unchanged. Role pictures use the existing `confirmedCharacterPortraits.js` mapping.

| Supplied file | Role | Published file |
| --- | --- | --- |
| 2080869_0.jpg | 傲慢魔女的親眷 | pride.jpg |
| 2080870_0.jpg | 嫉妒魔女的親眷 | envy.jpg |
| 2080871_0.jpg | 色慾魔女的親眷 | lust.jpg |
| 2080872_0.jpg | 憤怒魔女的親眷 | wrath.jpg |
| 2080873_0.jpg | 怠惰魔女的親眷 | sloth.jpg |
| 2080874_0.jpg | 暴食魔女的親眷 | gluttony.jpg |
| 2080875_0.jpg | 貪婪魔女的親眷 | greed.jpg |

## Verification

- OpenNext production build passed. ESLint: zero errors, seven image/font warnings. Existing redirect and Windows static-parameter checks passed.
- Public catalogue deep-equals the pre-release snapshot: 137 entries unchanged.
- All seven public JPEGs returned HTTP 200, matching local file size and SHA-256.
- Public Chrome page loaded all seven images at their original dimensions. Desktop and 390px / 320px layouts visually checked; no horizontal overflow. A card link opened its full-size image. Temporary viewport override reset.
- Existing Cloudflare live checks passed (catalogue expectation adjusted to 137 in memory only): page routes, redirects, homepage assets and auth callback behavior.
- Runtime secrets were preserved; deployment used the existing build/deploy CLI without secret updates.

Detailed public verification is stored in the parent workspace at `outputs/script-listing-20260924-witch/portrait-public-verification.json`.
