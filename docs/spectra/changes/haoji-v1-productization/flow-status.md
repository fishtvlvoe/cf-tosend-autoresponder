# Flow Status: haoji-v1-productization

| 欄位 | 內容 |
|---|---|
| 目前步驟 | **apply 完成**（Phase 1~6 全部勾選，待老魚驗收後 archive） |
| 上一個步驟 | Phase 5 部署與文件 → Phase 6 收尾 |
| 規格書 | docs/designs/newsletter-kit-v1-spec.md |
| 下一步行動 | 老魚依下方「明早驗收報告」驗收；通過後 `$spectra-archive` |

## 接手須知（給任何 AI / 代理）

1. 規格書 `docs/designs/newsletter-kit-v1-spec.md` 是**唯一可信來源**，逐條照做，勿憑感覺改安全參數
2. 每個 task 勾選前必須：code + focused test + 行為驗證（Gherkin 對應者需驗證通過）
3. 額度或 session 中斷不影響接手：git log + 本 tasks.md 即為完整狀態
4. 銷售頁在另一 repo：`B-產品/hokya/`（好寄/Hokya 銷售頁 + 錄影腳本）

## 規格偏差記錄（design.md 決策優先）

| 項目 | 規格 | 實作 | 原因 |
|---|---|---|---|
| 密碼雜湊 | scrypt N=16384… | **PBKDF2-SHA256 310k** | Web Crypto（Workers/Node 共通）無 scrypt；金魚審查明列 PBKDF2(310k) 為可接受定案 |

## 🌅 明早驗收報告（2026-11-05 凌晨自動產出）

### 完成項（全部有 commit，git log 可查）

- **Phase 1 安全地基**：PBKDF2 密碼 + AES-GCM 金鑰加密（crypto.ts）、空 token 後門修復、setup/change-password、單裝置滑動 session
- **Phase 2 設定頁**：settings 表、白名單 API（保留鍵 403）、verify-tosend 兩步驗證、onboarding derived、寄信閘門、後台第 5 頁籤
- **Phase 3 名單標籤 CSV**：tags 正規化 `;a;b;`、動態標籤選單、編輯/軟刪、CSV 匯入（UTF-8/1MB/5000列/列號含標頭）匯出（BOM）
- **Phase 4 寄信可靠性**：mailer config 從 settings 解密注入、單批 500、429 退避、campaigns.status、退信 bounced、cron 冪等（原子 UPDATE + hasDeliveryLogFor）
- **Phase 5 部署與文件**：wrangler vars 全清、deploy.yml、學員 README（含成本/忘記密碼/紅線）、AGENTS.md AI 導讀、檔首註解
- **Phase 6 收尾**：38/38 測試綠、UI 冒煙 13/13、乾部署通過、spectra validate + analyze 五維 Clean、乾淨 repo 已備妥

### 驗收指令（照順序跑，全部應過）

```bash
cd D-外掛與整合/cf-tosend-autoresponder
npm test                              # 38/38
node tests/e2e-smoke.mjs              # 需本機 wrangler dev（13/13）
npx wrangler deploy --dry-run         # 通過（不觸發遠端）
rg "\[ \]" docs/spectra/changes/haoji-v1-productization/tasks.md   # 零輸出
spectra validate haoji-v1-productization && spectra analyze haoji-v1-productization
```

### 未完成 / 待老魚人工項

1. **乾淨 repo 尚未 push**：已備妥在 `D-外掛與整合/haoji-newsletter/`（獨立 git，乾淨歷史、無 Plunk、有 LICENSE）。依 goal 邊界「不動遠端」未 push。驗收後執行：`gh repo create haoji-newsletter --private --source=. --push`（或改名後再建）。
2. **Gherkin 9（AI 友善驗收）**：需「乾淨 session 的 Claude Code」實測，列為開賣前人工檢查：把 repo 丟給新 session，問「歡迎信改為訂閱後第 1/3/7 天各一封」，觀察是否一次改對。
3. **遠端測試站未設 HAOJI_SECRET / 未更新**：線上 cf-tosend-autoresponder.workers.dev 仍是舊版部署；設定頁功能需重新 deploy + `wrangler secret put HAOJI_SECRET` 後才能在線上體驗。
4. **教學素材**：錄影腳本在 `docs/teaching/recording-script.md`，影片與截圖待老魚錄製。

### 建議驗收順序

1. `npm test` 看 38 綠 → 2. 本機 `npx wrangler dev` 開 `/login` 走「建密碼→設定頁→存檔」→ 3. 跑 e2e-smoke → 4. 看 `D-外掛與整合/haoji-newsletter/`（這就是學員會拿到的東西）→ 5. 沒問題就 `$spectra-archive` 並 push 乾淨 repo。
