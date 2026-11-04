# Tasks: haoji-v1-productization

> SSOT 完成狀態。每個 task 需 code + focused test + type-check + 行為驗證全過才可勾。
> 規格出處：docs/designs/newsletter-kit-v1-spec.md（簡稱「規格書 §x」）。

## 驗收卡（老魚已確認）

- [x] 產品定位：好寄（Hokya）買斷制電子報自架包，賣給台灣教學型自媒體人（概念報告老魚已確認）
- [x] 技術規格書已通過金魚五關兩輪審查，Status: Approved
- [x] 定價：早鳥 3,980／原價 9,980／買斷制；雙重保證（7 天猶豫 + 人工協助到好/全額退費）
- [x] ToSend Key 存 D1 加密（放棄 Worker Secrets 方案，老魚已同意）

## Phase 1：安全地基（Requirement: 密碼式後台認證）

- [ ] 1.0 需求覆蓋：本 Phase 對應 Requirement「密碼式後台認證」（spec.md，驗收情境見其 Scenario）

- [ ] 1.1 `src/crypto.ts`：scrypt（N=16384 r=8 p=1 salt16 dkLen32，格式 scrypt:N:r:p:saltB64:hashB64）+ 常數時間比對 + 單元測試（round-trip、錯密拒絕）
- [ ] 1.2 `src/crypto.ts`：AES-GCM（key=SHA-256(HAOJI_SECRET)，輸出 base64(iv):base64(ct含tag)）+ 單元測試（round-trip + 金鑰錯誤負測試）
- [ ] 1.3 重寫認證：POST /api/admin/login（密碼驗證→發 32B session）、/setup-password（僅未建密碼時、5 次鎖 10 分鐘）、/change-password（舊密錯 401、成功重發 session）、PASSWORRD_NOT_SET 403 flow；**移除 ADMIN_API_KEY 與空 token 後門**
- [ ] 1.4 Cookie 改 haoji_session（HttpOnly/SameSite=Strict/滑動 7 天，session_updated_at）
- [ ] 1.5 測試：未建密碼→setup→登入→改密→舊 session 失效（Gherkin 4 對應）

## Phase 2：settings 與設定頁（Requirement: 中文設定頁）

- [ ] 2.0 需求覆蓋：本 Phase 對應 Requirement「中文設定頁」（spec.md，驗收情境見其 Scenario）

- [ ] 2.1 `migrations/0000_init.sql`：完整建表（4 既有 + settings），時間欄 UTC ISO 8601
- [ ] 2.2 db.ts：settings CRUD（唯讀保留鍵 403、未知 key 400、加密鍵不回明文）；寫入後重算 onboarding_done
- [ ] 2.3 tags 正規化：所有寫入路徑存 `;a;b;`；migration 轉換舊資料
- [ ] 2.4 GET/POST /api/admin/settings（格式見規格書 §5）
- [ ] 2.5 POST /api/admin/settings/verify-tosend（不落庫先驗，10 秒逾時，錯誤分類：401 Key 無效／寄件網域未驗證／原文）
- [ ] 2.6 adminHtml 設定頁（單頁三組、存檔即驗、未完成黃色橫幅切頁籤、HAOJI_SECRET 重設→一鍵清除重設）
- [ ] 2.7 寄信前檢查：settings 未完成→400「請先完成設定頁」；cron 解密失敗→log + 跳過
- [ ] 2.8 Gherkin 1、6、8 驗證

## Phase 3：名單、標籤、CSV（Requirement: 標籤分眾、Requirement: 名單匯入匯出）

- [ ] 3.0 需求覆蓋：本 Phase 對應 Requirement「標籤分眾」與「名單匯入匯出」（spec.md，驗收情境見其 Scenario）

- [ ] 3.1 GET /api/admin/tags（explode + GROUP BY 即時計算）
- [ ] 3.2 PUT /api/admin/subscribers（部分更新、tags 覆蓋式正規化）+ DELETE 軟刪除（status='deleted' 預設不顯示）
- [ ] 3.3 `src/csv.ts` 解析/產生（§7.2 全部規則：標頭判斷、不支援引號、UTF-8+BOM 剝除、非 UTF-8 400、1MB→413、5000 列上限、後列蓋、row 從 1 含標頭）
- [ ] 3.4 POST /api/admin/import（text/csv）+ GET /api/admin/export（欄位 email,name,tags,status,created_at、BOM、YYYY-MM-DD HH:mm UTC+8）
- [ ] 3.5 名單頁：標籤編輯 UI、匯入（含錯誤明細表）、匯出按鈕
- [ ] 3.6 Gherkin 2 驗證（3 好 2 壞、row 號、重複匯入冪等）

## Phase 4：寄信強化（Requirement: 標籤分眾、Requirement: 寄信可靠性）

- [ ] 4.0 需求覆蓋：本 Phase 對應 Requirement「寄信可靠性」與「標籤分眾」（spec.md，驗收情境見其 Scenario）

- [ ] 4.1 tosend.ts 改顯式參數（不再讀 env）+ List-Unsubscribe / List-Unsubscribe-Post 信頭（RFC 8058）
- [ ] 4.2 target_tag 篩選（空=全部 active；bounced/unsubscribed/deleted 排除）+ 預覽 N 人
- [ ] 4.3 群發單批上限 500（超出 400）+ 429 退避（Retry-After 優先）+ campaigns.status（done/partial/failed）+ 逐人失敗不中斷
- [ ] 4.4 /api/webhook/tosend 退信標記 bounced（bounced 排除於所有寄信）
- [ ] 4.5 drip.ts：寄前原子 UPDATE 冪等、sending 10 分鐘 staleness 回收、寄前複查 status
- [ ] 4.6 Gherkin 3、5、7、10 驗證

## Phase 5：部署與文件（Requirement: 買斷制部署）

- [ ] 5.0 需求覆蓋：本 Phase 對應 Requirement「買斷制部署」（spec.md，驗收情境見其 Scenario）

- [ ] 5.1 wrangler.jsonc：移除 TOSEND_* 與 APP_URL vars，註明 HAOJI_SECRET
- [ ] 5.2 .github/workflows/deploy.yml（push/dispatch → migrations apply --remote → deploy；不含 d1 create）
- [ ] 5.3 README.md 學員開箱（對應教學單元：授權 CF、建 D1、部署、設定、忘記密碼救濟、勿設 public 紅框、HAOJI_SECRET≥32 字元）
- [ ] 5.4 AGENTS.md + 各 src 檔首 3~5 行中文導讀（Gherkin 9 AI 友善驗收：乾淨 session Claude Code 改對檔案）
- [ ] 5.5 免費額度核算（CF 定價頁截圖日期 + 500 名單情境），寫入 README 成本章節

## Phase 6：收尾交付

- [ ] 6.1 全測試綠 + rg "\[ \]" tasks.md 無殘留 + spectra validate 通過
- [ ] 6.2 新建 private repo `haoji-newsletter`：乾淨歷史、排除 docs/references/plunk 與 .dev.vars、移除 Plunk 字樣、加買斷授權 LICENSE
- [ ] 6.3 Gherkin 全 10 條 Playwright e2e 通過（含「零基礎學員 1 小時劇本」走查）
- [ ] 6.4 教學單元素材移交：影片 1~3 腳本、截圖清單（存放 B-產品/hokya/docs/）
