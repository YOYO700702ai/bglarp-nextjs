# 小六劇本上架 API

這組伺服器 API 共用既有草稿版本、圖片儲存、發布 RPC 與 Notion outbox。官網仍以 Notion 為資料來源。既有 `SCRIPT_ADMIN_AI_TOKEN` 保持只能寫草稿；本通道使用另一個 `SCRIPT_ADMIN_BOT_TOKEN`，只能存放於網站與 LINE 服務端。

## 共通約定

- 路徑前綴：`/api/admin/scripts/bot`。
- 每個請求：`Authorization: Bearer <SCRIPT_ADMIN_BOT_TOKEN>`。
- 每個 POST、PATCH、PUT 額外帶 `X-BGLARP-Request-Id` 與 `Idempotency-Key`。
- `X-BGLARP-Request-Id` 是案件生命週期不變的 ID，1–80 個英數字、底線或連字號，第一字必須是英數字。UUID 可用。
- `Idempotency-Key` 是該操作不變的 ID，1–100 個英數字、底線、連字號、冒號或句點，第一字必須是英數字。相同操作的 HTTP 重試必須使用同一個 key 與同一份內容。
- 伺服器把草稿 key 組成 `bot:{requestId}:{operationId}`。不同步驟使用不同 operationId；不要在重試時產生新案件或新操作。
- body 為 JSON，通常上限 256 KiB；案件狀態 PUT 上限 512 KiB。圖片走簽名 URL，不塞進 JSON。
- 所有回應都禁止快取。400 是需補正的資料，401 是服務 token 不正確，409 是重複名稱／非本案草稿／版本衝突；不要把這些錯誤當作可盲目重送的新上架。

## 介面

| 方法與相對路徑 | body／參數 | 回應 |
|---|---|---|
| GET `?name=劇本完整名稱` | 精確比對，不作模糊認領 | `{scripts,publicMatches}` |
| POST `/` | `{content}` | `{script,operationVersionId,idempotentReplay}`，新建 201、重送 200 |
| GET `/{id}` | catalog UUID | `{script,publication}` |
| PATCH `/{id}` | `{expectedVersionId,content}`，content 可部分更新 | `{script,operationVersionId,idempotentReplay}` |
| POST `/{id}/publish` | `{expectedVersionId}` | `{script,publication}`，公開驗證成功才 200，仍處理中 202 |
| POST `/{id}/sync` | `{expectedVersionId}` | 重試目前已發布版本的 Notion 同步，或只重新檢查官網 |
| POST `/media` | `{kind,contentType,size,sha256}` | `{upload}` |
| GET `/jobs/{key}` | key 為來源群組與使用者共同識別字的 SHA-256 | `{state,revision,updatedAt}`，不存在為 null、0、null |
| PUT `/jobs/{key}` | `{state,expectedRevision}` | 相同結構，成功 revision 遞增；版本衝突 409 |

新劇本 slug 固定由名稱產生，不允許另指定不同 slug；bot 目前也不改既有劇本名稱或 slug。若精確名稱已存在，必須讀取明確 catalog ID 與版本後，才可更新已發布版本。其他案件或員工尚未發布的草稿不能覆蓋。僅存在 Notion、尚未匯入 catalog 的劇本明確回報需後台匯入；不自動猜測同名資料的身分。

POST／PATCH 回傳的 `script` 可能已反映後來的編輯。因此後續發布必須使用 **`operationVersionId`**，不能任意改用當前 `script.draftVersionId`。發布端會拒絕已被新版本取代的 operationVersionId。

## 內容與圖片

content 沿用後台欄位：`name`、`synopsis`、`playerMin`、`playerMax`、`durationMinutes`／`durationLabel`、`priceStatus`／`price`、`genres`、`customTags`、`characters`、`cover`、`sortOrder`。角色新增選用欄位：

```json
{
  "name": "貪婪魔女的親眷",
  "description": "角色簡介",
  "image": {"url": "由 upload.publicUrl 取得", "path": "由 upload.path 取得", "alt": "貪婪魔女的親眷"},
  "display": "card"
}
```

沒有圖片可省略 image；display 可為 `avatar` 或 `card`。更新角色陣列時需送出完整、按角色名稱配對的陣列。發布前必須有類型；未提供角色名單可先上架。若提供名單，角色不得重名、名稱不能包含換行，角色數需介於設定人數上下限。

圖片請求 `kind` 為 `cover` 或 `character`，支援 JPG、PNG、WebP，上限 8 MiB。先由原始 bytes 計算小寫 SHA-256，再取得 grant。

upload 回傳 `bucket`、`path`、`publicUrl`、`contentType`、`maxBytes`、`sha256`、`alreadyUploaded`。若尚未上傳，還會回 `signedUrl`、`token`，可用 Supabase `uploadToSignedUrl(path,token,file,{contentType})`，或向 `signedUrl` PUT 原始 bytes（相同 Content-Type，禁止 upsert）。若 `alreadyUploaded:true`，伺服器已驗證檔案大小、hash 與格式，直接重用 URL，不用再 PUT。

儲存路徑固定為 `bot/{requestId}/{kind}/{sha256}.{extension}`，不覆寫原檔。新圖片只接受此網站專案的公開 `script-covers` bucket（或 `SCRIPT_COVERS_BUCKET`）；發布前會再次檢查已存圖片的 bytes 與 hash。可以沿用既有已發布劇本未變動的舊封面；新封面須先經此圖片通道。

## 完成判定與恢復

`publication.state` 有 `draft`、`sync_pending`、`verification_pending`、`live`。**只有 `state:live` 且 `verified:true` 才可以告訴員工「已上架」。** 此時回傳官網 URL 與 verifiedAt，已核對 Notion 對應 ID、資料、角色圖片，以及詳情頁的內容 fingerprint。

`script.status:published` 只是 catalog 正式版本已保存；Notion 未同步時官網可能仍舊。`202` 表示原資料已保存，應保留案件，稍後沿用版本重試。`/{id}/publish` 同版本重送會遵守 outbox 的退避時間；`/{id}/sync` 可顯式要求重試。單純等待快取更新可用 GET `/{id}`，不要建立另一筆草稿。

案件 state 只存文字、角色配對、媒體 URL、script ID、operationVersionId 與操作進度，不存圖片 bytes、data URL、reply token、密碼或存取金鑰。PUT 的 expectedRevision 必須來自最新 GET；若 PUT 逾時，以相同 state 及前一個 revision 重試，伺服器會返回已完成結果。`state:null` 結束目前案件，但保留 revision，避免舊訊息覆蓋新案件。

## 一次性部署設定

1. 套用 `supabase/migrations/20260924180000_catalog_bot_jobs.sql`。資料表及 CAS RPC 僅授權 service-role。
2. 網站設 `SCRIPT_ADMIN_BOT_TOKEN`，LINE 服務設 `BGLARP_BOT_TOKEN`，兩者使用相同的獨立通道金鑰，不可放瀏覽器或 Notion。
3. Notion 劇本資料庫新增 `角色圖片` rich_text 欄位（可用 `SCRIPT_NOTION_CHARACTER_IMAGES_PROPERTY` 指定名稱）。新角色圖片與角色簡介會寫入版本化 JSON，公開頁一次 catalog 查詢讀回，保留既有角色名稱及靜態圖片 fallback。
4. 保留 `SCRIPT_CATALOG_SOURCE=notion`。正式公開驗證 origin 預設為 `https://www.bglarp.com`；隔離預覽如需使用其他 HTTPS 網站，可設 `SCRIPT_PUBLIC_ORIGIN`，不要拿 production 可寫憑證測試預覽。

本檔只描述接口；未設定 token、未套資料表、未建立 Notion 欄位時不可視為已可使用。
