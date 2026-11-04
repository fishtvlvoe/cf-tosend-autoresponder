# AGENTS.md — 給 AI 助手的系統導讀

> 你是這個 repo 的 AI 助手。這是一份「好寄（Hokya）」電子報系統——單一 Cloudflare Worker + D1 SQLite，無前端框架。
> 修改任何功能前，請先讀這份文件與 `docs/designs/newsletter-kit-v1-spec.md`（Approved 規格書）。

## 架構一覽（改哪裡會影響哪裡）

| 檔案 | 職責 | 改它的後果 |
|---|---|---|
| `src/index.ts` | 所有 HTTP 路由與認證 guard | 加 API 要在 `/api/admin/` guard 區塊內；認證邏輯在檔案上方的 `validateSession` |
| `src/db.ts` | 所有 SQL（D1 存取的唯一入口） | 不要讓其他檔案寫 SQL；欄位變動要同步 `schema.sql` 與 `migrations/` |
| `src/adminHtml.ts` | 後台單頁 HTML（字串模板，注意內層 JS 的跳脫：`\\'` 才會吐出 `\'`） | 內嵌 JS 寫在模板字串裡，反引號與 `\n` 會被 TS 吃掉，要寫 `\\n` |
| `src/page.ts` | 公開頁面（著陸頁 / 登入 / 退訂） | 著陸頁文案讀 settings 的 `landing_*` |
| `src/drip.ts` | 排程引擎（歡迎信 + cron 跟進） | 寄信組態來自 `mailer.ts`；冪等邏輯在 `db.recordSentAndAdvanceStep` |
| `src/tosend.ts` | ToSend API 寄信（顯式參數，不讀 env） | 呼叫前先 `loadMailerConfig()` 注入 apiKey/from |
| `src/mailer.ts` | 從 settings 解密組態（HAOJI_SECRET） | 解密失敗要拋 `MailingConfigError`，呼叫端回 400 或跳過 cron |
| `src/crypto.ts` | PBKDF2 密碼雜湊 + AES-GCM 金鑰加密 | 參數不可自行更改（310k 迭代 / SHA-256 派生） |
| `src/csv.ts` | CSV 解析/產生 | 標籤分隔符是半形分號；格式規則見規格書 §7.2 |
| `src/types.ts` | 型別 + `normalizeTags`（`;a;b;` 正規化） | 所有 tags 寫入都要過 normalizeTags |

## 不可違反的規則（Invariants）

1. **寄信前必過 `isOnboardingDone`**（settings 未完成回 400「請先完成設定頁」）。
2. **密碼相關只走 `crypto.ts`**；session 是單一裝置、滑動 7 天；改密碼必重發 session。
3. **tags 一律存 `;a;b;`**；查詢用 `LIKE '%;tag;%'`（含 ESCAPE）。
4. **刪除聯絡人是軟刪除**（`status='deleted'`），不得硬刪（delivery_logs 有 FK）。
5. **金鑰永不回明文**：`GET /api/admin/settings` 對 `is_encrypted=1` 只回 `{set:true}`。
6. 新 API 錯誤格式統一 `{"error": "繁中人話訊息"}`。

## 本機開發

```bash
npm install
npm test                 # vitest（better-sqlite3 mock D1）
npx wrangler dev         # 本機 http://127.0.0.1:8787
```

`.dev.vars`（git-ignored）需有 `HAOJI_SECRET`。

## 常用改法範例

- 「歡迎信改為訂閱後第 1/3/7 天」→ 改 `schema.sql` 種子資料的 `email_sequences`（或後台「自動跟進排程」頁）。
- 「加一個新設定欄位」→ `WRITABLE_SETTINGS`/`REQUIRED_SETTINGS`（index.ts）→ `adminHtml.ts` 設定頁 → 如需加密寫入分支。
- 「改後台顏色/排版」→ `adminHtml.ts` 的 Tailwind class（CDN 版 Tailwind，無建置）。
