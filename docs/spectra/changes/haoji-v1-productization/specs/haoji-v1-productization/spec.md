# Spec Delta: haoji-v1-productization

## ADDED Requirements

### Requirement: 密碼式後台認證
系統 SHALL 以 scrypt 密碼雜湊 + 32-byte 隨機 session token 取代 ADMIN_API_KEY 明碼機制；空密碼或空 token 不得通過驗證；改密碼後舊 session 全部失效。

### Requirement: 中文設定頁
系統 SHALL 提供單頁中文設定介面，含網域、寄件人、著陸頁文案、ToSend 金鑰；金鑰以 AES-GCM 加密存放於 D1 settings 表；金鑰經「寄測試信驗證」成功後才寫入；所有必填設定完成前，寄信 API 回 400 且後台顯示提示橫幅。

### Requirement: 標籤分眾
系統 SHALL 支援聯絡人標籤的新增、編輯、篩選；標籤儲存格式一律正規化為 `;a;b;`；寄信可選 target_tag 僅寄給該標籤的啟用聯絡人；單批群發上限 500 人。

### Requirement: 名單匯入匯出
系統 SHALL 支援 CSV 匯入（UTF-8、≤1MB、≤5000 列、逐列錯誤回報含列號）與 CSV 匯出（含 BOM、欄位 email,name,tags,status,created_at）；重複 email 更新而非重複建立。

### Requirement: 買斷制部署
系統 SHALL 可由 GitHub Actions 一鍵部署至學員自有 Cloudflare 帳號（migrations + deploy 全自動）；repo 內建中文 README 開箱文件、AGENTS.md AI 導讀與各檔案中文導讀註解。

### Requirement: 寄信可靠性
系統 SHALL 具備 drip 排程冪等（原子狀態更新、staleness 回收）、退信 webhook 自動標記 bounced 並排除於寄送名單、RFC 8058 一鍵退訂信頭。
