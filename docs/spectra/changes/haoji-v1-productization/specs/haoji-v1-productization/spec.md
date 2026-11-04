# Spec Delta: haoji-v1-productization

## Purpose

把已驗證可用的 autoresponder 核心，產品化為「好寄」買斷制電子報自架包：補上零基礎學員開箱所需的設定頁、密碼認證、標籤介面、CSV 匯入匯出、一鍵部署與中文教學文件。細部規格以 docs/designs/newsletter-kit-v1-spec.md 為唯一可信來源。

## ADDED Requirements

### Requirement: 密碼式後台認證
系統 SHALL 以 scrypt 密碼雜湊 + 32-byte 隨機 session token 取代 ADMIN_API_KEY 明碼機制；空密碼或空 token 不得通過驗證；改密碼後舊 session 全部失效。

#### Scenario: 首次建立密碼並登入
- **WHEN** 系統尚未建立管理密碼且訪客 POST /api/admin/setup-password（密碼 ≥8 字）
- **THEN** 建立 scrypt 雜湊並自動登入，之後 setup-password 端點永久關閉

#### Scenario: 空密碼不得登入
- **WHEN** 訪客 POST /api/admin/login 且密碼欄為空字串
- **THEN** 回 401，絕不因空值而通過驗證（修復現行空 token 後門）

#### Scenario: 修改密碼使舊 session 失效
- **WHEN** 已登入者 POST /api/admin/change-password 成功
- **THEN** admin_session_token 重發，舊 Cookie 後續請求一律 401

### Requirement: 中文設定頁
系統 SHALL 提供單頁中文設定介面，含網域、寄件人、著陸頁文案、ToSend 金鑰；金鑰以 AES-GCM 加密存放於 D1 settings 表；金鑰經「寄測試信驗證」成功後才寫入；所有必填設定完成前，寄信 API 回 400 且後台顯示提示橫幅。

#### Scenario: 驗證成功才寫入金鑰

##### Example: 金鑰驗證流程
- **GIVEN** settings 表無 tosend_api_key，使用者填入 api_key=sk-live-123、from_email=me@mydomain.tw
- **WHEN** POST /api/admin/settings/verify-tosend 且 ToSend 回 200
- **THEN** POST settings 寫入密文；GET settings 回 {"tosend_api_key":{"value":null,"set":true}}
- **WHEN** 使用者在設定頁按下「驗證並儲存」且 ToSend 測試信寄送成功
- **THEN** tosend_api_key 以 AES-GCM 密文寫入 settings，GET /api/admin/settings 對該鍵只回 set:true 不回明文

#### Scenario: 設定未完成擋寄信
- **WHEN** 必填設定鍵未全部有值且訪問寄信 API
- **THEN** 回 400「請先完成設定頁」，後台各頁籤顯示提示橫幅

#### Scenario: 金鑰變更後提示重設

##### Example: 重設 HAOJI_SECRET
- **GIVEN** tosend_api_key 已用舊 HAOJI_SECRET 加密存放
- **WHEN** 學員在 GitHub 重設 HAOJI_SECRET 後進入設定頁
- **THEN** 解密失敗，該欄顯示「金鑰已變更，請重新輸入並驗證」與一鍵清除按鈕
- **WHEN** HAOJI_SECRET 被重設導致既有密文解密失敗
- **THEN** 設定頁該欄顯示「金鑰已變更，請重新輸入並驗證」並提供一鍵清除重設

### Requirement: 標籤分眾
系統 SHALL 支援聯絡人標籤的新增、編輯、篩選；標籤儲存格式一律正規化為 `;a;b;`；寄信可選 target_tag 僅寄給該標籤的啟用聯絡人；單批群發上限 500 人。

#### Scenario: 依標籤群發只寄給該標籤

##### Example: VIP 標籤群發
- **GIVEN** 名單：A(tags=";VIP;")、B(tags=";一般;")、C(status=bounced, tags=";VIP;")
- **WHEN** 對 target_tag="VIP" 執行群發
- **THEN** 僅 A 收到；B 未收到；C 因 bounced 被排除
- **WHEN** 管理者對標籤「VIP」執行群發
- **THEN** 僅 tags 含「VIP」且 status=active 的聯絡人收到信

#### Scenario: 群發超過上限被拒
- **WHEN** 預覽收件人數超過 500
- **THEN** 回 400「單批上限 500 人」，不執行任何寄送

### Requirement: 名單匯入匯出
系統 SHALL 支援 CSV 匯入（UTF-8、≤1MB、≤5000 列、逐列錯誤回報含列號）與 CSV 匯出（含 BOM、欄位 email,name,tags,status,created_at）；重複 email 更新而非重複建立。

#### Scenario: 匯入混合好壞列並回報列號
- **WHEN** 匯入含 3 筆正常與 2 筆壞列的 CSV
- **THEN** 成功 3、失敗 2，errors 陣列的 row 從 1 算起且含標頭列

#### Scenario: 重複匯入不產生重複名單

##### Example: 同檔匯入兩次
- **GIVEN** CSV 含 fish@example.com；名單已有該 email（name=舊名）
- **WHEN** 匯入同一檔案（name=新名）兩次
- **THEN** 兩次皆為 update；subscribers 表中 fish@example.com 僅一筆且 name=新名
- **WHEN** 同一 CSV 檔案匯入兩次
- **THEN** 既有 email 被更新而非建立第二筆，名單總數不變

### Requirement: 買斷制部署
系統 SHALL 可由 GitHub Actions 一鍵部署至學員自有 Cloudflare 帳號（migrations + deploy 全自動）；repo 內建中文 README 開箱文件、AGENTS.md AI 導讀與各檔案中文導讀註解。

#### Scenario: 學員網頁操作完成部署
- **WHEN** 學員在 GitHub 網頁設定 Secrets 並觸發 workflow（D1 已依教學手動建立）
- **THEN** Actions 完成 migrations apply 與 deploy，線上 /login 可訪問且首次可建密碼

#### Scenario: AI 助手讀懂 repo
- **WHEN** 使用者將 repo 交給全新 session 的 AI 助手並要求「歡迎信改為訂閱後第 1/3/7 天各一封」
- **THEN** AI 不追問即改對檔案且測試通過

### Requirement: 寄信可靠性
系統 SHALL 具備 drip 排程冪等（原子狀態更新、staleness 回收）、退信 webhook 自動標記 bounced 並排除於寄送名單、RFC 8058 一鍵退訂信頭。

#### Scenario: cron 重跑不重複寄信

##### Example: worker 重啟
- **GIVEN** cron 寄送 100 封信至第 40 封時 worker 重啟，該批日志狀態 sending
- **WHEN** cron 於 10 分鐘後再次觸發
- **THEN** 前 40 封依 delivery_logs 存在而跳過，第 41~100 封寄出，無人收到重複信
- **WHEN** cron 執行中 worker 重啟後再次觸發
- **THEN** 已 sending/pending 的信件依原子 UPDATE 與 staleness 規則處理，無聯絡人收到重複信

#### Scenario: 退信者不再收到信

##### Example: 硬退信標記
- **GIVEN** subscriber X（status=active）被 ToSend 回報 hard bounce
- **WHEN** POST /api/webhook/tosend 收到退信事件
- **THEN** X status=bounced；下一輪 drip 與群發的 SQL 皆排除 X
- **WHEN** ToSend 退信 webhook 回報某 subscriber 硬退信
- **THEN** 該 subscriber status=bounced，後續所有群發與 drip 排除該員
