# Cloudflare + ToSend Email Autoresponder (cf-tosend-autoresponder)

輕量、高效、100% 跑在 **Cloudflare Workers + Cloudflare D1** 上的開源 Email Autoresponder / Drip Campaign 系統。後端直接介接 **ToSend REST API**，專為 **AI Agent 操作** 與 **零伺服器維護** 設計。

---

## 📌 功能亮點

1. **極簡訂閱著陸頁**：
   - 訪問根目錄 `/` 即可看到專屬設計的極簡淺色訂閱頁面。
   - 支援姓名、Email 輸入，包含即時訂閱成功與錯誤反饋。
2. **完整發信與退信機制**：
   - 串接 **ToSend REST API**（`https://api.tosend.com/v2/emails`）。
   - 自動在信末附加 RFC 8058 規範的 **One-Click List-Unsubscribe** 標頭與專屬退訂連結。
   - 提供 Webhook 端點 `/api/webhook/tosend` 自動攔截 Bounce（退信）與 Complaint（投訴）並標記名單。
3. **自動排程 (Autoresponder / Drip Sequence)**：
   - 使用 Cloudflare **Cron Triggers**（預設每小時觸發一次）。
   - 依據訂閱時間差（`created_at + delay_hours`）自動發送第 1 封（即時歡迎信）、第 2 封（24 小時後）、第 3 封（72 小時後）等序列信件。
   - 支援模板動態變數替換（如 `{{name}}`、`{{email}}`）。
4. **專為 AI 設計的 REST API**：
   - AI 可以直接透過 HTTP Bearer Token 查詢名單、新增或修改信件範本、手動觸發測試排程。

---

## 📁 目錄結構

```
cf-tosend-autoresponder/
├── docs/
│   └── references/           # 拉下來的開源參考專案
│       ├── plunk/            # useplunk/plunk (Email platform & MCP 參考)
│       └── kolea/            # robconery/kolea (Cloudflare Email Sequence 參考)
├── src/
│   ├── index.ts              # Worker 入口 (Fetch 路由 + Scheduled Cron)
│   ├── types.ts              # 型別定義
│   ├── db.ts                 # D1 資料庫操作層 (Subscribers, Sequences, Logs)
│   ├── tosend.ts             # ToSend REST API 客戶端
│   ├── drip.ts               # Autoresponder 排程計算與變數替換引擎
│   └── page.ts               # 極簡訂閱著陸頁與退訂結果頁 HTML
├── schema.sql                # D1 資料庫結構
├── wrangler.jsonc            # Cloudflare Workers 設定檔
├── package.json
└── tsconfig.json
```

---

## 🛠️ 快速安裝與部署

### 1. 建立 Cloudflare D1 資料庫
```bash
npx wrangler d1 create autoresponder_db
```
執行後終端機會印出 `database_id`，請將其貼入 `wrangler.jsonc` 的 `database_id` 欄位。

### 2. 初始化資料庫結構
```bash
# 遠端建立資料表並預載 3 封示範序列信件
npx wrangler d1 execute autoresponder_db --remote --file=schema.sql

# 本地開發測試時執行：
npx wrangler d1 execute autoresponder_db --local --file=schema.sql
```

### 3. 設定環境 Secrets
```bash
# 填入你的 ToSend API Key (tsend_...)
npx wrangler secret put TOSEND_API_KEY

# 填入一組自訂的 Token 供 AI Agent 調用管理 API
npx wrangler secret put ADMIN_API_KEY
```

### 4. 部署上線
```bash
npx wrangler deploy
```

---

## 🤖 AI Agent 操作 API 說明

所有管理 API 均需要帶上 Header：`Authorization: Bearer <ADMIN_API_KEY>`

### 1. 讓 AI 新增或修改郵件序列範本
* **端點**：`POST /api/admin/sequences`
* **Payload 範例**：
```json
{
  "step_number": 4,
  "delay_hours": 120,
  "subject": "第 5 天跟進：你的進度還順利嗎？",
  "content_html": "<p>嗨 <strong>{{name}}</strong>，這是第 5 天的問候...</p>",
  "is_active": 1
}
```

### 2. 讓 AI 查詢名單狀態
* **端點**：`GET /api/admin/subscribers`
* **回傳**：包含訂閱者 Email、姓名、狀態（`active`、`unsubscribed`、`bounced`）、目前跟進步驟（`current_step`）與訂閱時間。

### 3. 讓 AI 手動觸發排程發信檢查
* **端點**：`POST /api/admin/trigger-cron`
* **回傳**：`{ "success": true, "sent_count": 3 }`（本次成功遞送的信件數量）。

---

## 🔗 ToSend Webhook 設定

在 ToSend 後台（Dash -> Webhooks）新增 Webhook：
* **URL**：`https://你的worker網址.workers.dev/api/webhook/tosend`
* **Events**：勾選 `bounce` 與 `complaint`。
* 系統將會在收件人退信或投訴時，自動在 D1 將該名單標記為無效，防止影響發信聲譽。
