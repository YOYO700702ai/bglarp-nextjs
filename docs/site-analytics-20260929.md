# 官網每日統計與員工後台

入口：`https://www.bglarp.com/admin/analytics`。沿用既有員工帳號；劇本後台的「網站數據」導覽可直接進入。

## 指標

- 頁面瀏覽：公開頁面開啟／SPA 切頁時累計，重新開啟也計入。頁內分頁只記點擊。
- 每日訪客估計：每日隨機瀏覽器識別碼；同瀏覽器當天多次瀏覽或點擊合併。7／30／90 天摘要是每天訪客估計相加，不是跨日不重複人數。
- 熱門頁面與劇本按詳情瀏覽排行；劇本卡片點擊另列於按鈕排行。不存在的劇本頁不由正常 tracker 記入。
- 預約點擊涵蓋 Messenger、Facebook 預約 CTA、十月活動預約、電話聯絡；不是完成訂位。
- 按鈕含現正熱映／旗艦／心測／最新活動分頁、LINE 加好友、會員卡、會員活動辦法、活動影片、導覽與社群入口。
- 來源與裝置按瀏覽次數分類；來源取首次可取得的 referrer／utm_source 並僅保留固定分類，來源缺失會歸為直接／無來源。
- 全部日期為 Asia/Taipei。`tracked_since` 之前是「尚未統計」，不是零。只從本次啟用開始，不宣稱匯入既有 GTM／GA 歷史。
- 追蹤失敗、廣告阻擋或瀏覽器限制可能漏記；換裝置、瀏覽器或清除儲存可能重複計訪客。員工／發布驗證的公開頁面瀏覽同樣會計入，後台頁面本身不追蹤。

## 資料與權限

Cloudflare Worker `bglarp-site` 使用獨立 D1 `bglarp-site-analytics`（binding `ANALYTICS_DB`），不共用 LINE 會員資料庫。

`POST /api/analytics/collect` 在 Worker 入口分流：正式 www 或 localhost 同源、JSON、8 KB／10 筆上限、固定事件格式、event UUID 去重、daily visitor 最多 500 筆、明顯 bot 排除。Prepared SQL 寫入獨立事件表。接收端依台北日期雜湊當日隨機 ID，不儲存原始 IP／User-Agent／referrer／query／表單／會員 ID。前端儲存的 ID 每日替換。

報表 `GET /api/admin/analytics?days=1|7|30|90` 在讀取 D1 前呼叫 `requireScriptAdmin()`，僅既有 active editor/publisher/admin 可讀聚合結果；回應 `private, no-store`。不回傳單一訪客軌跡，不使用 AI/bot token 通道。

查詢最多近 90 個台北日；接收新事件時，每天首次清理 90 日窗之前的原始事件。不是到期即執行的排程刪除；無新事件時保留至下次清理。

## 操作與驗證

正式設定在 `wrangler.jsonc`，schema 在 `cloudflare/analytics/schema.sql`。新環境先建立專屬 D1，套用 schema，再更新 binding。啟用時可執行：

```sql
INSERT OR IGNORE INTO analytics_metadata (key, value)
VALUES ('tracked_since', strftime('%Y-%m-%dT%H:%M:%fZ','now'));
```

不得將測試事件填入正式庫。測試用 `scripts/test-site-analytics.mjs` 的 in-memory SQLite，直接執行相同 schema／collector／report SQL。瀏覽器 QA fixture 位於忽略的 `.tmp/analytics-qa`，只監聽 127.0.0.1，使用獨立記憶體資料庫，不進正式 bundle。

驗證命令：

```text
node scripts/test-site-analytics.mjs
node scripts/test-canonical-redirect.mjs
node scripts/test-static-script-params.mjs
node scripts/check-site-analytics-live.mjs
npm run build:cloudflare
npm run deploy:cloudflare
```

實作依據：[OpenNext bindings](https://opennext.js.org/cloudflare/bindings)、[Cloudflare D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)。

## 2026-09-29 發布證據

- 工作分支 `codex/admin-site-analytics-20260929`，基於中友活動正式版本 `0c03e27`；沿用 managed worktree `chungyo-october`，未更動桌面主 checkout 的其他工作。
- Cloudflare 正式版本：`7bc5041c-1347-40f6-ade7-4efcf5903c88`；前一版 `e1b2e5bd-9cde-48e4-a03e-8219be0996bb` 可供回復。
- 13 組實際 SQLite/schema 測試、定向 ESLint、canonical redirect/static params 回歸、Cloudflare build 成功。
- 本機真實 Chrome + React StrictMode + collector + SQLite：兩次首頁與指南／中文劇本頁共 4 次瀏覽、同日訪客 1、5 次點擊、預約 1；404 劇本未記入瀏覽，404 上按鈕亦忽略。測試庫位於記憶體，未填入正式庫。
- 報表以本機樣本驗證 1／7／90 日、未啟用狀態、真實 0 與非零值、每日明細與排行。正式 staff session 成功讀取並切換 1／7／30 日；未登入 API 回 401 且 no-store，collector GET 回 405。
- 正式官網實際開啟首頁、切兩個分頁、點魔女論破，後台回讀 2 次瀏覽／1 每日訪客／3 次點擊；這些是發布驗證瀏覽，不應解讀為顧客成效。
- 正式後台 390 px / 320 px 已視覺確認；document scrollWidth 分別 384 / 314，沒有整頁水平溢出。正式數據頁 console 無 error。
- 原中友與會員卡均保留，GTM 未替換。輸出目錄：原始桌面專案 `outputs/site-analytics-20260929`，包含本機測試 JSON、正式 desktop/390/320 PNG 與畫面文字。
- 最終公開唯讀 QA 16/16 通過：10 頁與 23 個 JS/CSS 回應 200，137 筆劇本與發布前 deepEqual；中友／會員順序與原 GTM 保留；未登入 401、collector GET 405、錯誤 Origin 403。結果檔 `live-readonly-verification.json`。
