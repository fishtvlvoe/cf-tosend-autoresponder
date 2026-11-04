# Cloudflare + ToSend Email Autoresponder MVP 技術規格書

- **文件狀態**：`Status: Approved` (老魚正式簽核生效)
- **架構負責**：🐘 大象 (Elephant - Main Session)
- **審查紀錄**：經 🐠 零記憶金魚 (Goldfish Reviewer) 五關毒舌審查並完成逐項修訂
- **專案路徑**：`D-外掛與整合/cf-tosend-autoresponder`

---

## 一、問題定義與目標 (Problem & Scope)

### 1. 痛點
市面上的 Email Autoresponder（如 ConvertKit / Mailchimp）費用高昂、架構封閉，且不易讓本地 AI Agent 自動化編排。開源專案（如 Plunk）又多依賴 Docker 與 PostgreSQL，無法直接在邊緣無伺服器架構零成本運行。

### 2. 本專案目標
打造 100% 跑在 **Cloudflare Workers + Cloudflare D1** 上的開源超輕量 Email Autoresponder。
- 後端介接 **ToSend REST API** 發信。
- 專門支援 **AI Agent 透過 REST API / 自動化編排**。
- 嚴格遵守 RFC 8058 規範，確保 Gmail / Yahoo 高送達率與零違規。
- 完全落在 Cloudflare 免費額度內，達到真正的零伺服器維護成本。

---

## 二、被放棄的替代方案 (Abandoned Alternatives)

| 方案 | 放棄原因 |
|---|---|
| **自建 Docker + Node.js + Postgres (Plunk)** | 需維護 VPS 或付費雲端託管，違反「零維護、邊緣無伺服器」初衷。 |
| **Worker 內部純記憶體計時器 (setTimeout / setInterval)** | Worker 是無狀態邊緣節點，請求結束即凍結，無法處理跨日長週期排程。 |
| **GET 連結直接觸發退訂** | 現代企業防毒爬蟲 (SafeLinks/Gmail Bot) 會預讀信內所有 GET 連結，導致訂閱者剛收信就遭「幽靈退訂」。 |

---

## 三、完整資料庫架構 (Cloudflare D1 DDL)

```sql
-- 1. 訂閱者名單表
CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced', 'complained'
  unsubscribe_token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 2. 郵件跟進序列範本表
CREATE TABLE IF NOT EXISTS sequences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  step_number INTEGER NOT NULL UNIQUE,
  delay_hours INTEGER NOT NULL,
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- 3. 發信日誌與防重複投遞表
CREATE TABLE IF NOT EXISTS send_logs (
  id TEXT PRIMARY KEY,
  subscriber_id TEXT NOT NULL,
  sequence_id INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'sent', 'failed'
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  sent_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE(subscriber_id, sequence_id)
);

-- 4. 效能索引
CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_send_logs_lookup ON send_logs(subscriber_id, sequence_id, status);
CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences(is_active, delay_hours);
```

---

## 四、API 契約與通訊協定

### 1. 訂閱端點：`POST /api/subscribe`
* **輸入 Payload**：
  ```json
  {
    "email": "user@example.com",
    "name": "Alex",
    "hp_company": ""
  }
  ```
* **防刷與蜜罐 (Honeypot)**：
  - 前端隱藏 `hp_company` 欄位（CSS `display:none`）。
  - 若 `hp_company` 不為空，代表為惡意爬蟲機器人，直接回傳 HTTP 200 `{ "success": true }` 但默默丟棄，防止刷爆 D1 與 ToSend 配額。
* **重複訂閱規則**：
  - 若 Email 已存在且狀態為 `active`：回傳成功，不重發 Sequence 0，不覆蓋。
  - 若狀態為 `unsubscribed`：允許重新訂閱，更新狀態為 `active`，更新 `created_at = now()`，並清除該用戶過往的 `send_logs`，重新開始計算序列週期。

### 2. 退訂防護協定 (RFC 8058 + 防爬蟲 GET)
* **Web 人類瀏覽 (GET `/unsubscribe?token=<TOKEN>`)**：
  - 瀏覽器打開時，**不直接變更資料庫**。
  - 渲染確認頁面，帶有一顆「確認取消訂閱」按鈕，點擊後以 `POST /api/unsubscribe` 完成退訂，徹底防止安全爬蟲誤退訂。
* **郵件客戶端一鍵退訂 (POST `/api/unsubscribe`)**：
  - 符合 RFC 8058 規範：
    ```http
    List-Unsubscribe: <https://example.com/api/unsubscribe?token=TOKEN>
    List-Unsubscribe-Post: List-Unsubscribe=One-Click
    ```
  - 當收件端軟體（Gmail / Yahoo）發出 POST 請求時，系統驗證 Token 後直接將 `subscribers.status` 改為 `unsubscribed`。

### 3. Webhook 投遞端點：`POST /api/webhook/tosend`
* 接收 ToSend 平台的 Bounce 與 Complaint 事件，即時將 D1 名單標記為 `bounced` 或 `complained`，確保永不再發。

---

## 五、Drip 排程引擎與極端邊界防護

### 1. 觸發與頻率
* Cloudflare Cron Triggers 每小時執行一次 (`0 * * * *`)。

### 2. 核心 SQL 運算邏輯 (解決阻斷問題)
```sql
SELECT s.id AS subscriber_id, s.email, s.name, s.unsubscribe_token, q.id AS sequence_id, q.subject, q.content_html
FROM subscribers s
JOIN sequences q ON q.is_active = 1
LEFT JOIN send_logs l ON l.subscriber_id = s.id AND l.sequence_id = q.id
WHERE s.status = 'active'
  AND (s.created_at + (q.delay_hours * 3600000)) <= ?
  AND (l.id IS NULL OR (l.status = 'failed' AND l.retry_count < 3))
ORDER BY s.created_at ASC
LIMIT 50;
```

### 3. 邊界保護規範
* **退訂強隔離**：SQL 強制 `s.status = 'active'`，退訂者永遠被排除。
* **分批防超時**：強制 `LIMIT 50`。若累積待發名單大於 50 筆，留給下一小時或後續排程消化，絕不讓單次 Worker 超時被強制掐死。
* **暫態錯誤重試**：
  - 遇到 5xx 或網路超時時，記錄 `status = 'failed', retry_count = retry_count + 1`。
  - 只要 `retry_count < 3`，下個小時會再次嘗試；超過 3 次標記為永久失敗，不再重試。
* **姓名變數安全替換**：
  - 變數 `{{name}}` 若訂閱者有填寫則顯示；若為空字串或 null，正則替換為空字串，嚴禁外露 `{{name}}` 破圖。

---

## 六、金魚審查 (Goldfish Review) 意見修訂對照表

| 審查層級 | 金魚提出的致命問題 | 本規格修訂後的解決方案 |
|---|---|---|
| 🔴 **Blocking** | Drip SQL 漏掉退訂過濾 | SQL 聯集強制加入 `WHERE s.status = 'active'`，阻斷非法寄信。 |
| 🔴 **Blocking** | 欠缺 DDL 與 Sequence 定義 | 規格第三節補齊完整 SQLite DDL，包含索引與欄位規範。 |
| 🔴 **Blocking** | 暫態失敗寫死 UNIQUE 導致永不重試 | 新增 `retry_count` 欄位，允許三次容錯重試後才封存。 |
| 🔴 **Blocking** | Cron 缺少批次限制會超時暴斃 | SQL 強制加入 `LIMIT 50`，徹底消除 Worker 執行時間上限風險。 |
| 🟡 **Major** | RFC 8058 實作方向錯誤 | 退訂拆分為「GET 需按鈕確認防爬蟲」與「POST 符合 One-Click 協定」。 |
| 🟡 **Major** | 重複訂閱邏輯未定 | 明確定義已退訂者重新訂閱時重置週期，已啟用者則冪等忽略。 |
| 🟡 **Major** | 訂閱端點易遭灌爆 | 加入前端 Honeypot 蜜罐欄位，無痛防禦自動化刷信機器人。 |

---

## 七、實作與驗收就緒度 (Implementation Readiness)

本規格已通過邏輯無死角審查，下個階段可直接由代碼 Agent 依據此規格啟動 **TDD（測試驅動開發）**：
1. `tests/subscribe.spec.ts`：測試訂閱寫入、Honeypot 攔截、重新訂閱重置。
2. `tests/unsubscribe.spec.ts`：測試 GET 防誤退、POST 一鍵退訂、狀態更新。
3. `tests/drip.spec.ts`：測試時間推進計算、退訂過濾、`LIMIT 50` 截斷、3 次重試機制。
