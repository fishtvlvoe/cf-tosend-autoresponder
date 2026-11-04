# 技術規格書：好好寄（haoji-newsletter）v1

> Status: Approved（金魚五關兩輪審查通過，v3 收斂殘留項）
> 上游文件：`docs/designs/newsletter-kit-v1-concepts_brief.md`
> 歷程：2026-11-05 v1 → 金魚五關審查（全數阻斷）→ v2 修補 → 五關複審（3 放行、2 有條件放行）→ v3 收斂殘留項定案

## 1. 問題定義與目標

把可運作的 autoresponder 產品化為可販售商品：新建乾淨 private repo `haoji-newsletter`，讓零基礎學員在 **1 小時內**從「GitHub 連結 CF」到「寄出第一封自動信」。

成功驗收劇本（含教學觀看時間在內）：
買課程 → 拿到 repo 權限 → 影片 1：GitHub 授權 CF、設 Secrets（5 分鐘）→ 影片 2：CF Dashboard 建 D1（點 4 下，2 分鐘）→ GitHub 網頁按 Actions 部署 → 開後台 → 影片 3：設定頁填資料 → 前台收測試訂閱 → 自動歡迎信寄出。

> **部署的正確定義（統一口徑，全文與教學皆用此說法）**：「一鍵部署，首次需 30 秒手動建資料庫」。即：唯一前置手動步驟 = CF Dashboard 網頁建 D1（影片 2）；之後每次部署 = GitHub 網頁按一個按鈕（Actions workflow_dispatch / push 自動觸發）。**workflow 不自動建 DB**（`wrangler d1 create` 無法在 CI 內安全回寫 database_id 至 wrangler.jsonc，已驗證排除）。

## 2. 學員環境假設（白紙黑字）

- 學員有 GitHub、Cloudflare（免費方案）、ToSend 三個帳號（皆自備，教學含註冊引導）。
- 學員**不碰 terminal**；一切操作在 GitHub / Cloudflare / 本系統後台的網頁完成。
- 學員網域：可用免費 `*.workers.dev`（教學預設）或自有網域（教學另含綁定章節）。
- 免費額度核算：**launch 前必勾任務**——以 CF 官方定價頁截圖（標日期）核算「500 名單、每月 4 封排程信」情境，寫進教學「成本結構」章節。
- 學員會用 Claude Code / Cursor 之類的 AI 助手改 repo（驗收見 §9 Gherkin 9）。

## 3. 技術堆疊

單一 Cloudflare Worker + D1（SQLite），TypeScript，Vitest，ToSend API，CF Cron Trigger。後台為 Worker 渲染 HTML（無前端框架）。

套件政策：不引第三方 runtime 套件。CSV 用自寫簡易解析器（§7.2 限制）；密碼雜湊與 AES 用 Web Crypto 內建。

## 4. 資料庫綱要（D1）

**baseline 為 4 張表**（附錄 A 摘要）：`subscribers`、`email_sequences`、`campaigns`、`delivery_logs`。乾淨 repo 從零建 migrations，首支 migration = 完整建表，之後每支只做增量。

v1 新增 1 張表：

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_encrypted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))  -- 全庫統一 UTC ISO 8601
);
```

migration 一併處理：既有表時間欄改 UTC ISO 8601（乾淨 repo 無舊資料，僅格式生效，無資料搬移）；**既有 subscribers.tags 字串正規化為 `;a;b;` 格式**（前後皆有分號，首尾標籤可被 LIKE 邊界命中，見 §7.2）。

**明確不做**（v1.1 再議）：標籤正規化表、import_jobs 表、標籤改名端點。

### settings 鍵清單（唯一可信來源）

| key | 說明 | 加密 | 必填 | 經 settings API 可寫 |
|---|---|---|---|---|
| `tosend_api_key` | ToSend API Key | ✅ | ✅ | ✅ |
| `tosend_from_email` | 寄件人信箱 | ❌ | ✅ | ✅ |
| `tosend_from_name` | 寄件人顯示名稱 | ❌ | ✅ | ✅ |
| `site_domain` | 學員網域 | ❌ | ✅ | ✅ |
| `landing_title` | 著陸頁主標題 | ❌ | ✅ | ✅ |
| `landing_intro` | 著陸頁副文案 | ❌ | ❌ | ✅ |
| `admin_password_hash` | scrypt 格式 | ❌ | ✅（首次建立） | ❌ 唯讀（403） |
| `admin_session_token` | 隨機 session id | ❌ | 自動 | ❌ 唯讀（403） |
| `admin_session_updated_at` | 最後活動時間（滑動過期用） | ❌ | 自動 | ❌ 唯讀（403） |
| `onboarding_done` | derived：必填鍵全有值 = 1 | ❌ | 自動 | ❌ 唯讀（403） |

> 加密金鑰 = Worker Secret `HAOJI_SECRET`，永不進 D1。README 紅框規定：**HAOJI_SECRET 須為 ≥32 字元隨機字串**（影片 1 示範用密碼管理器產生），低熵 Secret 會讓密文形同裸奔。

## 5. API 一覽（含確切格式）

錯誤統一：`{"error": "<繁中人話>"}`。

### 公開（無認證）
| 方法 | 路徑 | 說明 |
|---|---|---|
| GET | `/` | 著陸頁（讀 landing_*、site_domain） |
| POST | `/api/subscribe` | body `{email, name?, hp_company?}`；honeypot 有值→靜默 200 不寫庫；email 已存在→200 `{"success":true,"duplicate":true}` 並 upsert name；格式錯→400。subscribers.email 有 UNIQUE 約束兜底 |
| GET/POST | `/unsubscribe` | 兩階段退訂；token 無效給明確錯誤頁 |
| POST | `/api/webhook/tosend` | 退信 webhook → 標記 subscriber `status='bounced'`（bounced 不再收到任何群發/drip）。教學與 README 必含「ToSend 後台填此 URL」步驟 |

### 認證（全部位於 index.ts `/api/admin/` guard 區塊內）
登入：POST `{"password"}` → scrypt 驗證 → 發 32-byte 隨機 session 寫 `admin_session_token` + `admin_session_updated_at` + Set-Cookie `haoji_session`（HttpOnly, SameSite=Strict, Max-Age 7 天滑動）。**無任何 token 預設放行（修復現行空 token 後門）**。

| 方法 | 路徑 | 規格 |
|---|---|---|
| POST | `/api/admin/login` | 密碼錯 401；未建密碼 → 403 `{"error":"密碼尚未建立","code":"PASSWORD_NOT_SET"}` |
| POST | `/api/admin/setup-password` | 僅限 `admin_password_hash` 不存在時。body `{password}`（≥8 字）。**防搶注：失敗 5 次鎖 10 分鐘（以 settings 鍵 `setup_lock_until` 記）**；成功一次後端點永久關閉。README/影片 1 強調「部署完成立刻建密碼」 |
| POST | `/api/admin/change-password` | body `{old_password, new_password}`；old 錯 → 401；成功 → 重發 session、舊 session 失效 |
| GET | `/api/admin/stats` / `/api/admin/logs` | 現行行為（附錄 A），**僅統計/顯示終態列（sent/failed），排除 pending/sending** |
| GET/POST | `/api/admin/sequences` | 現行（3 關） |
| GET | `/api/admin/subscribers?tag=&q=` | tag 篩選：`tags LIKE '%;' \|\| tag \|\| ';%'`（依 `;a;b;` 正規化格式，§7.2） |
| POST | `/api/admin/subscribers` | 手動新增；tags 寫入即正規化 |
| PUT | `/api/admin/subscribers` | body `{id, name?, tags?, status?}` 部分更新；tags 覆蓋式且正規化 |
| DELETE | `/api/admin/subscribers?id=` | 軟刪除：改 `status='deleted'`，預設不顯示 |
| GET | `/api/admin/tags` | `{"tags":[{name,count}]}`（tags 字串 explode + GROUP BY 即時計算） |
| POST | `/api/admin/import` | text/csv，規則 §7.2 |
| GET | `/api/admin/export` | text/csv，格式 §7.2 |
| POST | `/api/admin/send-direct` / `/campaigns/send` / `/trigger-cron` | 現行 + `target_tag`（§7.3）；settings 未完成 → 400 `{"error":"請先完成設定頁"}` |
| GET | `/api/admin/settings` | `{"settings":{key:{"value":<值\|null>,"set":<bool>}}}`。加密鍵永不回明文，一律 `{"value":null,"set":true\|false}`；未設的非加密鍵回 `{"value":null,"set":false}` |
| POST | `/api/admin/settings` | body `{key, value}` 單鍵。未知 key → 400；唯讀保留鍵 → 403。寫入後伺服器重算 `onboarding_done` |
| POST | `/api/admin/settings/verify-tosend` | body `{api_key, from_email, from_name}`，用待存值直接呼叫 ToSend 寄測試信給 from_email（不落庫）；逾時 10 秒；失敗 400 + 錯誤分類（§7.1）；成功回 `{"success":true}` |

## 6. 模組實作計畫（行數預算）

| 檔案 | 動作 | 內容 | 預算 |
|---|---|---|---|
| `src/index.ts` | 重寫認證段 | 密碼登入/session/鎖定；新路由全進 guard 區塊；`ADMIN_API_KEY` 機制全移除 | 500 行 |
| `src/db.ts` | 修改 | settings CRUD（含保留鍵防護）；tags explode/group；軟刪除 | 400 行 |
| `src/csv.ts` | 新增 | §7.2 解析/產生 | 120 行 |
| `src/crypto.ts` | 新增 | §7.4 AES-GCM + scrypt 封裝（含自測向量） | 150 行 |
| `src/tosend.ts` | 修改 | 顯式參數（不再讀 env）；加 `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` 信頭 | 130 行 |
| `src/drip.ts` | 修改 | 寄信前先載 settings 注入參數；§7.5 冪等 | 120 行 |
| `src/page.ts` | 修改 | 著陸頁讀 settings；建密碼頁；退訂頁沿用 | 400 行 |
| `src/adminHtml.ts` | 修改 | 設定頁、標籤編輯、匯入匯出、橫幅 | 1,400 行（超過拆 `admin/` 子模組） |
| `migrations/0000_init.sql` | 新增 | 完整建表 | — |
| `.github/workflows/deploy.yml` | 新增 | push/workflow_dispatch → install → `d1 migrations apply DB --remote` → `wrangler deploy`。**不含 d1 create**（§1 已定案） | — |
| `wrangler.jsonc` | 修改 | 移除 `TOSEND_*` vars 與 `APP_URL`（功能由 settings.site_domain 取代）；註明 Secrets：`HAOJI_SECRET` | — |
| `README.md` | 重寫 | 學員開箱文件（對應 §8 教學單元） | — |
| `AGENTS.md` + 各檔首註解 | 新增 | AI 導讀 | — |
| `tests/` | 新增 | §9 | — |

## 7. 關鍵行為規格

### 7.1 設定流程（單頁 + 欄位即驗）
- 單一設定頁分組顯示：基本 / 寄信 / 安全。每欄「存檔即驗證」。
- `onboarding_done` derived：每次 settings 寫入後伺服器重算，無獨立旗標操作。
- 未完成：各頁籤上方黃色橫幅「請先完成初始設定」，點擊 = 切到設定頁籤（SPA 行為）。
- **site_domain 驗證**：存檔時與當前 request Host 比對；不一致需明確勾選「我使用自有網域」並再一次確認。README 警示：「換網域後舊信內連結失效，退訂請用信件頂部一鍵退訂按鈕」（不受 site_domain 影響）。
- ToSend Key 兩步驟：按「驗證並儲存」→ POST verify-tosend（待存值，不落庫）→ 成功才寫入（加密）。
- 錯誤分類：ToSend 401 →「API Key 無效」；寄件網域未驗證 →「請先到 ToSend 驗證寄件信箱」；逾時/其他 → 顯示 ToSend 回應原文。
- 忘記密碼：README 教「CF Dashboard D1 網頁介面刪除 `admin_password_hash` 列 → 重走建密碼流程」（純網頁）。

### 7.2 CSV 與 tags 格式（逐條定案）
- **tags 儲存正規化（寫入端唯一格式）**：一律存 `;a;b;`（前後分號）。所有寫入路徑（CSV 匯入、POST/PUT subscribers、手動新增）先正規化再落庫；migration 轉換舊資料。
- 匯入 body：text/csv ≤1MB（超 → 413 +「請分批匯入」）；僅 UTF-8（BOM 剝除；UTF-8 解碼失敗 → 400「編碼錯誤：請用 Excel『另存新檔 → CSV UTF-8』」）。
- 格式：`email,name,tags` 逗號分隔；tags 欄多標籤用半形分號；**不支援**引號包裹/欄位內逗號換行（偵測到引號開頭 → 400 說明）。
- 首列判斷：第一列第一欄去空白轉小寫 = `email` → 視為標頭略過。
- 逐列：email 格式錯 → 記失敗；庫內已存在 → 更新 name/tags；同檔重複 → 後列蓋前列；空列跳過。
- 回傳：`{"success":true,"total":N,"succeeded":X,"failed":Y,"errors":[{"row":r,...}]}`；row 從 1 算起**含標頭列**（與 Excel 列號一致）。
- >5,000 列 → 400 提示分批（Worker CPU 上限；教學建議每批 1,000）。
- 匯出：欄位順序 `email,name,tags,status,created_at`；標籤分號 join；日期 `YYYY-MM-DD HH:mm`（UTC+8）；BOM 開頭；status 用 DB 值。

### 7.3 依標籤寄信 + 群發上限
- `target_tag` 空 = 全部 active（bounced/unsubscribed/deleted 一律排除）；指定 = tags 含該標籤。畫面先顯示「將寄給 N 人」預覽。
- **單批上限 500 人**：預覽數 > 500 → 400「單批上限 500 人，請依標籤分批」。（ToSend 無 batch API，逐人同步寄；500 人已逼近單 request wall-clock 上限。v1.1 再評估佇列化。）
- 逐人寄送、單人失敗不中斷，記 delivery_logs(status='failed', error)；完成回 `{"success":true,"sent":X,"failed":Y}`。
- 429 → 有 `Retry-After` 標頭則依它等待（以非阻塞方式：`await fetch('https://example.com', {signal: AbortSignal.timeout(delay)})` 實現延遲），無則立即重試，最多 3 次仍敗記 failed。
- campaigns 表加 `status`（done/partial/failed）。
- settings 未完成：API 回 400；cron 跳過本輪 + `console.error`（drip 內解密失敗同此行為：記 error log、跳過本輪、不中斷其他排程）。

### 7.4 安全規格（定案）
- **密碼**：scrypt N=16384 r=8 p=1 salt=16B dkLen=32；格式 `scrypt:N:r:p:saltB64:hashB64`；常數時間比對。
- **Session**：32B 隨機 → `admin_session_token` + `admin_session_updated_at`；滑動 7 天；**單一裝置**（第二台登入踢掉第一台，README 說明避免誤報 bug）；改密碼即重發、舊失效。
- **AES-GCM**（tosend_api_key 專用）：key = `SHA-256(UTF-8(HAOJI_SECRET))` → importKey('raw', aes-gcm)；IV 12B；輸出 `base64(iv):base64(ciphertext含16-byte authTag)`；解密失敗（含 tag 驗證）= 「金鑰已變更」。
- **HAOJI_SECRET 重設**：設定頁顯示「ToSend Key 因金鑰變更失效，請重新輸入並驗證」+ 一鍵清除密文重設；README 紅框警告。
- repo 不可設 public：README 紅框 + 事後處理（ToSend 換 Key → 重驗證）。

### 7.5 Drip 冪等
- 寄前原子 `UPDATE delivery_logs SET status='sending' WHERE id=? AND status='pending'`，影響 0 列 → 跳過（防多執行個體重複）。
- 進度推進用條件式 UPDATE（`WHERE current_step=?`）。
- 重啟後：sending 超過 10 分鐘視同 pending 重跑（at-least-once 語意：極少數「ToSend 已寄出但 response 遺失」會重複，以此為代價上限，白紙黑字接受）。
- 每輪寄送前重新檢查 status（active 才寄）。

## 8. 教學內容交付規格

教學是買斷制商品本體：

| 單元 | 內容 | 對應步驟 | 產製角色 |
|---|---|---|---|
| 影片 1（5 min） | GitHub 授權 CF、repo 連結、設 Secrets（含示範產生 HAOJI_SECRET） | 部署前 | 老魚錄製，開發代理寫腳本 |
| 影片 2（3 min） | CF Dashboard 建 D1（點 4 下，截圖素材） | 部署前 | 截圖素材由開發代理產 |
| 影片 3（10 min） | 設定頁、測試信、收第一封訂閱 | 劇本後段 | 老魚錄製 |
| 圖文 | README（repo 內）+ 課程頁 | 全程 | 開發代理寫初稿 |
| 成本結構頁 | CF/ToSend 額度核算（§2 必勾任務） | — | 開發代理 |

存放：repo 內 README + docs/；影片 v1 過渡方案 = unlisted YouTube + 課程頁密碼（課程平台選型屬第二期）。

## 9. 驗收測試計畫

單元：scrypt round-trip + 錯密拒絕；AES round-trip + 金鑰錯誤負測；settings 敏感鍵不回明文 + 保留鍵 403；CSV 解析全規則（標頭/後列蓋/row 號/非 UTF-8/413）；CSV 匯出 BOM；tags explode/group；冪等 UPDATE；bounced 排除。

Gherkin（繁中）：
1. 假設 後台未完成設定，當 學員填 ToSend Key 並通過測試信驗證，那麼 Key 密文儲存、GET settings 不回明文、onboarding_done=1。
2. 假設 CSV 含 3 好 2 壞列，當 匯入，那麼 成功 3 失敗 2、row 號與 Excel 一致、重複匯入不產生重複名單。
3. 假設 聯絡人 A 標籤「VIP」，當 對「VIP」群發，那麼 僅 A 收到。
4. 假設 Actions 部署完成且已手動建 D1，當 學員首次建密碼，那麼 可登入後台。
5. 假設 cron 執行中 worker 重啟，當 cron 重跑，那麼 無人收到重複信。
6. 假設 HAOJI_SECRET 被重設，當 學員進設定頁，那麼 看到錯誤提示與一鍵重設。
7. 假設 ToSend 回 429 於群發中途，當 重試 3 次仍敗，那麼 該人記 failed、完成回成功/失敗摘要。
8. 假設 設定未完成，當 呼叫寄信 API，那麼 回 400「請先完成設定頁」。
9. 假設 把 repo 交給全新 session 的 Claude Code，當 要求「歡迎信改為訂閱後第 1/3/7 天各一封」，那麼 AI 不追問即改對檔案且測試通過。
10. 假設 subscriber X 被 ToSend 回報硬退信，當 退信 webhook 觸發，那麼 X status=bounced 且不再收到任何寄信。

## 10. 被放棄的替代方案

| 方案 | 放棄原因 |
|---|---|
| supastarter/Next.js monorepo | 學員部署維護門檻過高 |
| ToSend Key 存 Worker Secrets | 網頁設定頁無法直寫 |
| 接 CF API 從設定頁寫 Secrets | 學員需額外 CF API Token |
| 標籤正規化表 | v1 字串欄已足夠（推 v1.1） |
| import_jobs 表 | 去重逐列比對即可（推 v1.1） |
| 四區設定精靈狀態機 | 單頁欄位即驗足夠 |
| workflow 自動 `wrangler d1 create` | database_id 無法在 CI 安全回寫 wrangler.jsonc（v3 定案排除） |
| 開源 public repo | 買斷制無法成立 |

## 附錄 A：現行 repo baseline 摘要

- 4 表 DDL（以現行 `schema.sql` 為準）：`subscribers(id,email UNIQUE,name,status,unsubscribe_token,current_step,tags,created_at,updated_at)`、`email_sequences(step_number PK,delay_hours,subject,content_html,is_active,created_at)`、`delivery_logs(id,subscriber_id,sequence_id NULL,tosend_message_id,status,error_message,sent_at)`、`campaigns(id,name,subject,content_html,target_tag,sent_count,created_at)`。
- 現行後台 API 行為（stats/logs/sequences/send-direct/campaigns/trigger-cron）：實作時照抄現行 `src/index.ts` 並套用 §7。
- 現行必修缺陷（不得照抄）：登入空 token 後門；Cookie 存 API Key 本體；無密碼機制。
