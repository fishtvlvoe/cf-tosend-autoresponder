# Change: haoji-v1-productization（好寄 v1 商品化）

## Why

cf-tosend-autoresponder 的核心功能（收名單、寄信、排程跟進）已實機驗證可用（11 項測試全綠、ToSend 實發成功），但要作為「好寄（Hokya）」教學商品賣給零基礎學員，缺少開箱體驗：設定頁、密碼登入、標籤介面、CSV 匯入匯出、一鍵部署 workflow、中文教學文件。

## What Changes

依 Approved 規格書 `docs/designs/newsletter-kit-v1-spec.md`（金魚五關兩輪審查通過）實作：

- 重寫認證：scrypt 密碼 + 隨機 session，**修復現行空 token 後門**（index.ts `|| expectedToken`）
- 新增 `settings` 表與中文設定頁（單頁欄位即驗，derived onboarding_done）
- ToSend Key 加密存放（AES-GCM，金鑰 = SHA-256(HAOJI_SECRET)）+ verify-tosend 兩步驗證
- 標籤：寫入正規化 `;a;b;`、篩選、依標籤寄信 target_tag
- CSV 匯入/匯出（§7.2 全部規則：UTF-8/BOM/1MB/5000 列/row 號含標頭/後列蓋）
- 群發上限 500、429 退避、campaigns.status、delivery_logs pending/sending 冪等（§7.5）
- 軟刪除 subscribers、退信 webhook 標記 bounced、RFC 8058 信頭
- GitHub Actions 部署 workflow（不含 d1 create，§1 已定案）
- README 學員開箱文件 + AGENTS.md AI 導讀 + 各檔首中文註解
- 最終交付：新建乾淨 private repo `haoji-newsletter`（排除 Plunk 參考資料與真實資料）

## 上游文件（實作前必讀）

1. `docs/designs/newsletter-kit-v1-spec.md`（**Approved 規格書，逐條照做**）
2. `docs/designs/newsletter-kit-v1-concepts_brief.md`（產品定位）
3. 現行 `src/`、`schema.sql`、`wrangler.jsonc`（baseline；必修缺陷見規格書附錄 A）

## Impact

- 既有 4 表 + 新增 settings 表；既有表時間欄改 UTC ISO 8601
- `ADMIN_API_KEY` 機制與 `TOSEND_*`/`APP_URL` vars 全部移除
- 新增檔案：src/crypto.ts、src/csv.ts、migrations/0000_init.sql、.github/workflows/deploy.yml、AGENTS.md
