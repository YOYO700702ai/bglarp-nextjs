# 劇本員工後台啟用手冊

目前程式採安全預設：不套 migration、不設定正式環境變數時，官網與 Notion 流程不會改變。以下步驟應先在 Supabase 測試／預覽環境完成，再切正式前台。

## 1. 建立資料表

在 BGLARP 專用 Supabase 專案依序執行：

`supabase/migrations/20260811165000_create_forum_script_registry.sql`

`supabase/migrations/20260811170000_create_script_catalog_admin.sql`

第一個 migration 只建立後台發布所需的 `forum_scripts` 劇本識別表；第二個新增劇本後台資料表、RPC、公開 view 與 `script-covers` bucket。兩者皆使用 `if not exists` 或可重跑的定義，不會刪除或重建既有資料。

## 2. 設定登入

1. 在 Supabase Authentication 啟用 Google provider。
2. 將本機、正式站 www／apex，以及受控的 Vercel Preview `/auth/callback` 加入允許的 redirect URL。Google Cloud 的 OAuth redirect URI 則填 Supabase 顯示的 `/auth/v1/callback`。
3. 第一位管理員先用 Google 登入一次，讓 `auth.users` 建立帳號。
4. 在 SQL Editor 執行下列指令；把信箱及顯示名稱換成實際管理員：

```sql
insert into public.script_admin_users (user_id, role, display_name)
select id, 'admin', 'BGLARP 管理員'
from auth.users
where lower(email) = lower('owner@example.com')
on conflict (user_id) do update
set role = excluded.role,
    display_name = excluded.display_name,
    is_active = true;
```

角色：

- `editor`：建立與修改草稿、上傳封面。
- `publisher`：加上發布、下架與同步重試。
- `admin`：加上員工權限管理。

## 3. 設定伺服器環境變數

依 `.env.example` 設定：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（只可放伺服器）
- `NOTION_TOKEN`
- `DATABASE_ID`
- `SCRIPT_ADMIN_AI_TOKEN`（長隨機值，只可放伺服器）
- `SCRIPT_CATALOG_SOURCE=notion`

Notion integration 必須獲得目標資料庫的讀取、插入與更新內容權限。第一階段維持既有 `Notion-Version: 2022-06-28` 與 `DATABASE_ID`，不要在同一次上線中升級資料來源 API。

## 4. 預演並匯入既有 Notion 劇本

先確認 migration 與環境變數都已設定，再從本機執行。預設模式只讀 Notion、只比對 Supabase，不會寫入：

```powershell
node --env-file=.env.local scripts/import-notion-catalog.mjs
```

先檢查摘要與逐筆阻擋原因；也可以用 `--limit=5` 小量預演。確認無誤後才明確加上 `--apply`：

```powershell
node --env-file=.env.local scripts/import-notion-catalog.mjs --apply
```

工具可安全重跑；只有資料完整且使用永久 HTTPS 封面的項目會發布。缺欄位或使用會過期的 Notion file 封面時，只建立草稿並列出原因。工具由本機直接連 Notion 與 Supabase，不經過 Vercel Function。

## 5. 預覽環境驗收

Preview 不可共用 Production 的可寫 Supabase、Notion token 或 AI token。若只需要驗證編譯，可以不設定 Preview secrets；若要測試發布／下架，必須使用隔離的測試資料庫與 Notion 測試資料庫。

開啟 `/admin/scripts`，依序確認：

1. 一般玩家登入後得到「沒有後台權限」。
2. editor 可以建立名稱不空白的草稿，但不能發布。
3. publisher 可以發布完整草稿。
4. 封面直接出現在 Supabase Storage；Vercel Function 不接收圖片檔本身。
5. Notion 成功時顯示「已同步」；刻意停用 Notion token 時，Supabase 正式版本仍保留並顯示同步失敗。
6. 修復 token 後，在劇本編輯頁按「重試 Notion 同步」。
7. 下架後公開 view 不再回傳該劇本，但歷史版本與穩定識別仍存在。

## 6. AI 草稿 API

AI 使用獨立路徑，但與員工後台共用相同驗證與資料庫 RPC：

- `POST /api/admin/scripts/ai`：建立草稿。
- `PATCH /api/admin/scripts/ai/{scriptId}`：更新草稿。

每次都必須帶：

```text
Authorization: Bearer <SCRIPT_ADMIN_AI_TOKEN>
Idempotency-Key: <每次操作唯一且重試時保持相同的值>
Content-Type: application/json
```

AI token 只有草稿權限；發布仍需 publisher 或 admin 在員工後台確認。

## 7. 正式切換

在既有 Notion 劇本完整匯入 Supabase，並比對筆數、封面、網址與發布狀態前，不要切換資料來源。

驗收完成後才將：

```text
SCRIPT_CATALOG_SOURCE=supabase
```

部署後檢查首頁、任意三本劇本、劇本識別關聯及 sitemap。Supabase 讀取失敗時程式會讓請求失敗，由 Vercel ISR/CDN 保留最後成功內容；不會自動讀取可能尚未完成下架同步的 Notion 清單。若需要回到 Notion，必須由管理者手動將環境變數改回 `notion`。

## 8. 不可做的操作

- 不要建立每分鐘全量 Notion↔Supabase 同步。
- 不要讓瀏覽器取得 service-role key、Notion token 或 AI token。
- 不要在上架單一本劇本時重新部署全站。
- 不要在尚未比對資料前切換 `SCRIPT_CATALOG_SOURCE`。
