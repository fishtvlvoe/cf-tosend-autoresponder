# toSend 開發者串接文件與速查手冊 (toSend Developer Docs)

> 由 FluentCRM & FluentSMTP 原廠團隊推出的新一代交易型郵件 (Transactional Email) 平台。  
> 官方網站：https://tosend.com  
> 官方文件：https://tosend.com/docs/

---

## 目錄導覽

| 分類 | 目錄 / 檔案 | 內容摘要 |
|---|---|---|
| **全合一完整參考** | [TOSEND_FULL_DEVELOPER_REFERENCE.md](./TOSEND_FULL_DEVELOPER_REFERENCE.md) | 所有 API、SDK、教學與遷移指南合併單一文件（方便丟進 LLM） |
| **API 參考** | [01-api/](./01-api/) | REST API v2 端點、驗證方式、錯誤代碼與 Rate Limits |
| **官方 SDK** | [02-sdks/](./02-sdks/) | Node.js, Python, PHP, Laravel, Go 套件與程式碼範例 |
| **核心功能指南** | [03-guide/](./03-guide/) | 網域名稱驗證、DMARC、SMTP、Webhooks、Email Logs、MCP 等 |
| **平台遷移指南** | [04-migrate/](./04-migrate/) | 從 FluentSMTP, Resend, Postmark, Mailgun, SendGrid 無痛遷移 |

---

## 1. 核心 API 快速導覽

### 基礎資訊
- **Base URL**: `https://api.tosend.com`
- **驗證方式 (Header)**: `Authorization: Bearer <api_key>`
- **計費策略**: $0.30 / 1,000 封信，無最低月費，註冊即送 10,000 封額度

### 常用端點

#### 1. 發送單封郵件 (Send Email)
- **路徑**: `POST /v2/emails`
- **檔案詳細**: [01-api/02-send-email.md](./01-api/02-send-email.md)
```bash
curl -X POST https://api.tosend.com/v2/emails \
  -H "Authorization: Bearer tsend_..." \
  -H "Content-Type: application/json" \
  -d '{
    "from": { "email": "hello@example.com", "name": "Acme" },
    "to": [{ "email": "user@example.com", "name": "Jane Doe" }],
    "subject": "Welcome to Acme",
    "html": "<h1>Hello!</h1>"
  }'
```

#### 2. 批次發送郵件 (Batch Emails)
- **路徑**: `POST /v2/emails/batch`
- **檔案詳細**: [01-api/03-batch-emails.md](./01-api/03-batch-emails.md)
- 單次最多 100 封，每封可客製獨立收件者、標題與內文。

#### 3. 帳號狀態與額度 (Account Info)
- **路徑**: `GET /v2/account`
- **檔案詳細**: [01-api/04-account-info.md](./01-api/04-account-info.md)

#### 4. 管理 API (Admin API)
- **路徑**: `GET /v2/admin/...`
- **檔案詳細**: [01-api/05-admin-api.md](./01-api/05-admin-api.md)
- 管理 Client Teams（Agency 多租戶）、Sending Keys、Domains、Webhooks、Suppressions。

---

## 2. 官方 SDK 安裝範例

### PHP (相容 WordPress / Fluent 賣場生態系)
```bash
composer require tosend/tosend-php
```
```php
use ToSend\Client;

$tosend = new Client('tsend_...');
$tosend->emails->send([
    'from' => ['email' => 'orders@buygo.me', 'name' => 'BuyGo'],
    'to' => [['email' => 'customer@example.com']],
    'subject' => '訂單確認通知',
    'html' => '<p>感謝您的訂購！</p>'
]);
```

### Node.js / TypeScript
```bash
npm install @tosend/node
```
```typescript
import { ToSend } from '@tosend/node';

const tosend = new ToSend({ apiKey: 'tsend_...' });
await tosend.emails.send({
  from: 'hello@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Welcome</p>'
});
```

### Python
```bash
pip install tosend
```
```python
from tosend import ToSend

client = ToSend(api_key="tsend_...")
client.emails.send(
    from_email="hello@example.com",
    to="user@example.com",
    subject="Hello",
    html="<p>Welcome</p>"
)
```

---

## 3. MCP (Model Context Protocol) 整合

### 伺服器規格
- **Server URL**: `https://mcp.tosend.com/mcp`
- **Transport**: Streamable HTTP
- **認證機制**: OAuth (toSend 儀表板授權) 或 Bearer Token (`tsend_admin_...`)

### 已完成本機環境設定：
1. **Claude Code**: 已寫入用戶全域配置（`claude mcp add -s user --transport http tosend https://mcp.tosend.com/mcp`）
   - 初次使用時執行 `claude mcp login tosend` 或在對話中開啟即可觸發瀏覽器授權。
2. **Cursor**: 已加入 `~/.cursor/mcp.json`：
   ```json
   "tosend": {
     "url": "https://mcp.tosend.com/mcp"
   }
   ```
3. **Antigravity CLI**: 已加入 `~/.gemini/config/mcp_config.json`：
   ```json
   "tosend": {
     "url": "https://mcp.tosend.com/mcp"
   }
   ```

### MCP 提供的可用工具清單
- **帳號狀態**: `get_account`（餘額、退件率、投訴率）
- **網域管理**: `list_domains`, `get_domain`, `add_domain`, `delete_domain`
- **郵件紀錄**: `list_emails`, `get_email`（投遞狀態日誌，不含內文保護隱私）
- **實際發信**: `send_email`（需在授權頁手動勾選 "Send email" 權限）
- **名單壓制**: `list_suppressions`, `remove_suppression`
- **Webhook**: `list_webhooks`, `create_webhook`, `update_webhook`, `delete_webhook`
- **團隊管理**: `list_teams`, `create_team`, `update_team`
