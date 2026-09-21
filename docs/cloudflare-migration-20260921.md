# Cloudflare migration — release record

## Final hosting/billing status — 2026-09-21 04:48 Taiwan

- **Vercel Pro cancelled**, dashboard visibly shows **Hobby Plan / Active**. Cancellation dialog estimated $11.33 refund; bank receipt not verified.
- Main final Worker version: `8f7bcb78-f878-455d-91a3-0dd6b65f2c93`; classroom version `ef3e5f0d-5748-4abf-ab14-6e03847b26fd`.
- Classroom legacy redirect deployed successfully: `dpl_5xyHn65B6mereHoUsmB9heHfaSBf`. Old paths/query return 308 to classroom.bglarp.com. New origin now resolves normally on this computer; Chrome shows original teacher login page.
- Post-cancellation main live checks, new classroom 200, legacy 308, member GET 200 and LINE endpoint/signature/official test pass.
- Source saved in PR #18 (this repo) and classroom PR #36. Not merged. Classroom requires human review by its repository rules.
- Original Vercel projects retained, not deleted. Pausing the old BGLARP copy was **not executed**: Vercel CLI requires the owner to type the project name in an interactive terminal. Did not automate that confirmation or bypass it. Main DNS has no Vercel origin dependency; do not use the old copy as the new commercial production service.

## 04:44 checkpoint (resolved items are recorded above)

| Service | Official origin | Hosting / data |
| --- | --- | --- |
| BGLARP official site | https://www.bglarp.com | Cloudflare Worker `bglarp-site`; original Notion catalogue + Supabase auth/drafts/storage |
| BGLARP apex | https://bglarp.com | Cloudflare exact-host 308 to www; path, query, UTM and gclid preserved |
| BGLARP staff catalogue | https://www.bglarp.com/admin/scripts | Same original staff login, not made public |
| Member / coupons / stamps | https://member.bglarp.com/member | Existing `bglarp-member` Worker / D1 unchanged |
| Classroom pet game | https://classroom.bglarp.com | Cloudflare `classroom-pet-quest`; original Supabase unchanged |

- Workers Paid and R2 activated with owner authorization. Workers base is $5/month **plus usage**, not a spending cap. R2 bucket `bglarp-site-next-cache` is cache-only.
- Official-site DNS now uses proxied `www AAAA 100::` and `@ A 192.0.2.1` as no-origin records, intercepted by the two exact Worker routes in `wrangler.jsonc`. No Vercel origin is required. Keep proxy enabled; never remove the Worker routes before restoring an origin.
- Domain custom-origin attachment rejected conflicting old DNS without changing it. Used documented Worker routes instead. Original DNS recovery values: `dns-before-cutover-20260921.json`. Other five DNS records preserved, including Google verification and membership domain.
- Exact catalogue parity with the old production was checked **before** DNS changes: 136/136 JSON records. Title/canonical, sitemap and robots parity passed.
- `check-cloudflare-live.mjs` passes on normal official DNS: main public/admin pages, expected `/scripts` -> `/#scripts` redirect, encoded script URL, 11 JS/CSS assets, 136 records, safe auth redirect and no-store response. Response is Cloudflare/OpenNext, not Vercel.
- Cloudflare-only AI **draft** key restored by generating a new key; old Vercel key was not changed. Anonymous request 401; valid new key with intentionally malformed JSON returns 400 before any write. No known external client config was found; any separate AI client with the old key must use the local protected new setting. Never put key values in this report.
- `FORUM_SYNC_SECRET` is unused by this production source; an old redacted value is not deployed.
- Real secrets remain in ignored `.env.production.local` and Worker Secrets. Notion was copied from the existing integration, not reissued. Supabase keys restored through authorized CLI without rotations.
- Runtime dependency audit: zero findings. Lint: no errors, six pre-existing warnings. Development dependency advisories are not a completed security audit.
- Windows filename colon in `聲聲慢2:此生不換` fixed by excluding only filesystem-unsafe prerender names on Windows; dynamic route preserves original URL. Linux prerender behavior unchanged.
- A Next/OpenNext hostname redirect incompatibility was caught during cutover. Rolled back to the last verified build, then replaced it with exact-host `canonicalRedirect` in the custom Worker. Unit/live tests verify no www loop, full path/query preserved.
- Classroom: existing single LINE webhook now migrated after official LINE verification; valid empty event 200 / invalid signature 401. Existing rich menu has no old-host URI dependencies. Supabase new Site URL and redirect allowlist configured, old allowlist retained.
- **Still pending at this checkpoint:** old classroom Vercel redirect deployment and Vercel Pro downgrade. The first two deployment attempts were blocked by Vercel Git email matching, not by the app. Retrying using previously successful public owner Git identity, without disabling deployment protection.

### QA limits

No real member/student records were cleared, no production catalogue entries changed, and no real LINE messages sent. Staff upload/publish and teacher/student credential login were not exercised with real credentials. Public browser rendering has no broken images; viewport override did not take effect, so this run does **not** claim 390/320 mobile verification. The classroom custom domain resolves at both authoritative servers, Google DNS-over-HTTPS and LINE, but the local ISP/browser still has NXDOMAIN cache; TLS/direct authoritative-address HTTP is valid. Preserve the old service until transition checks succeed.

### Future deployment

Use this migration branch/worktree, not the old dirty desktop checkout. `npm ci`, `npm run lint`, unit tests, then `node scripts/deploy-cloudflare-candidate.mjs --production` with the protected original env. Finally run `node scripts/check-cloudflare-live.mjs` and `node scripts/check-ai-migration-auth.mjs https://www.bglarp.com`. This deploy is manual; GitHub pushes do not automatically publish Cloudflare yet. Keep the classroom project separate and follow its review rules. Do not merge unrelated work.

## Earlier preparation history (superseded by current status above)

- Source: verified Vercel production commit 078d8a66a225e14b8c84283b4bb02845c5cb63c5.
- Isolated worktree; original desktop changes remain untouched.
- Next.js 16.3.0 -> 16.3.5 for OpenNext 1.20.6 peer compatibility.
- Candidate Worker: bglarp-site. No custom domain is bound yet.
- Keep existing Supabase database, Notion data and all member Worker resources.
- ISR requires new cache-only R2 bucket and Durable Objects; bucket is not created yet.
- Owner completed Workers checkout. On 2026-09-21 the Cloudflare Workers plans
  page shows Paid / Current plan ($5 per month plus usage). No new Worker deployed.
- Vercel CLI authenticated by owner. Environment export completed, but 7 BGLARP
  variables and 4 classroom-pet-quest variables are redacted as [SENSITIVE].
  Do not deploy those placeholders or disable Vercel secret protections.
- Cloudflare secrets must be uploaded as secrets, never public vars or committed .env.
- CPU limit is a per-request guard, NOT a monetary cap.

## Preparation checks completed

- OpenNext build passed on Windows (Next.js 16.3.5, OpenNext 1.20.6).
- Wrangler 4.135.0 dry-run passed: 1,089 static assets; Worker gzip 1,516.43 KiB.
- git diff --check passed. No cloud resource was created by these checks.
- Build has no production environment yet; catalogue/auth functionality is NOT
  validated by this build. Rebuild after exporting the real environment.
- npm install reported 8 audit findings; review affected runtime/development
  dependency paths before release. Do not treat the build as a security audit.
- classroom-pet-quest production source independently verified as
  bb1877ee421e6f6e2d15b7bc6631bb025ec9244b; isolated worktree exists at
  C:/Users/user/Desktop/班級經營用的寵物養成系統-cloudflare-migration-20260921.
  No application changes there yet. Vercel CLI added a local environment ignore
  rule. New origin choice is pending the owner.
- No production DNS, database, LINE webhook, or Vercel subscription changes
  have been made. Workers Paid activation is the only verified plan change.
- 2026-09-21 follow-up: `npm audit --omit=dev` reports one moderate advisory
  in baseline-browser-mapping (GHSA-w5vr-8v7q-w6rv), zero high/critical runtime
  findings. Dependency remediation and full audit remain release checklist items.
- Owner logged into Supabase on 2026-09-21. Authenticated CLI access also works;
  both original project refs are ACTIVE_HEALTHY. Existing public/service-role
  settings restored to git-ignored environment files without printing values,
  issuing new keys, changing database data or weakening access controls.
- Existing Notion `BG使用` integration recovered using its Copy UI and a one-use
  loopback form into ignored local config. No token rotation or permission change.
  SCRIPT_CATALOG_SOURCE remains notion. Clipboard temporary token cleared.
- Remaining BGLARP redactions: SCRIPT_ADMIN_AI_TOKEN and FORUM_SYNC_SECRET.
  Do not replace those tokens without a coordinated client change.
- R2 list fails with code 10042 (not enabled). Owner's dashboard is on the
  Add R2 subscription page: $0 base, included 10 GB / 1M class A / 10M class B;
  usage overage and recurring terms require owner confirmation. Not clicked.
- baseline-browser-mapping updated; runtime `npm audit --omit=dev` now zero
  findings. Full dependency audit still reports 7 development findings.
- Classroom candidate deployed, not cut over:
  https://classroom-pet-quest.hankvictor1023.workers.dev
  Latest version acf2658d-eaf5-46f0-a13c-334d407cdfcb; public basic routes and
  unauthenticated teacher redirect checked. Real login/LINE callback not tested.

## Cutover gate

Do not cancel Vercel or change DNS until both bglarp-nextjs and classroom-pet-quest
have passed migration checks. Verify staff login, catalogue parity, image upload,
publish/unpublish and ISR, redirects, sitemap, static assets and mobile layout.
Use explicit test data only and do not edit production catalogue entries for QA.
For classroom-pet-quest verify Supabase auth redirects, teacher/student login,
LINE signatures and callbacks, old URL/QR dependencies and new official origin.

The old vercel.app hostname cannot move to Cloudflare. Confirm a replacement and
a transition strategy before cancelling. Keep old deployments for rollback;
do not delete Vercel projects or databases as part of subscription cancellation.
