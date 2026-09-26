# 中友 × BGLARP 十月活動發布

- 正式網址：https://www.bglarp.com/#scripts-limited
- Cloudflare Worker：`bglarp-site`
- 本次版本：`e1b2e5bd-9cde-48e4-a03e-8219be0996bb`
- 前一版本：`00423d2c-aa83-4a30-82de-43d066ef2026`
- 以正式來源 `6d5ea3a` 建立 `codex/chungyo-october-20260926`；沒有使用過時的根目錄活動稿或 origin/main 版型。

## 活動與素材

- 10 月限定：來店出示中友百貨會員身分，玩任一劇本費用折抵 NT$100。
- 只要扮裝入場，就可以體驗轉轉盤，抽小禮物與萬聖節提燈。
- 依 2026-09-03 使用者核定內容；未新增打卡、次數、每人或每團單位、滿額、併用限制。
- 圖片使用父專案 `outputs/halloween-2026/v13-portrait-retouch/BGLARP_萬聖節海報_人物手部精修_v13.png`，保留完整畫面，轉為 WebP，1254 × 1254、416,616 bytes。
- 原活動說明在父專案 `outputs/chungyo-delivery/activity-brief/BGLARP_中友合作活動說明.pdf`。
- 最新活動第一張新增十月卡；既有會員卡、舊卡換禮連結與預約影片完整保留。

## LINE

- 官方帳號 `@037erbkz`，原規則 `81260920`「最新活動」。
- 關鍵字「最新活動」「活動」與啟用狀態保留。
- 訊息順序：十月海報、十月說明、原會員圖片、原會員說明。
- 原會員文字 175 字未改動；原圖 1280 × 720 保留。十月海報 1254 × 1254，說明 187 字，連到 `/#scripts-limited`。
- 已套用並重新載入後台，確認四則訊息、兩張圖片與文字皆保留。未群發訊息，未做真實手機點擊收訊測試。

## 驗證與部署

- `npm run lint`：0 errors，7 個既有 warnings。
- `npm run build:cloudflare` 成功；既有 canonical redirect 與 Windows static params 檢查通過。
- 電腦、390px、320px 瀏覽器檢查：圖片完整、按鈕正常、無水平溢出。
- 以既有 `npm run deploy:cloudflare` 部署；沒有更改 Worker secrets、DNS 或會員系統。
- 正式站首頁文案、順序與原會員內容確認；海報 HTTP 200 且 SHA-256 與本機一致。
- 劇本 API 137 筆與發布前快照完全一致；Cloudflare 原有公開檢查全部通過（僅在記憶體將舊預期筆數 136 更新為實際 137）。
- 截圖與公開驗證紀錄在父專案 `outputs/chungyo-october-release-20260926/`。

後續正式網站改動須以此分支或其後續 commit 為基礎，避免退回未包含十月活動的舊 Cloudflare 工作樹。
