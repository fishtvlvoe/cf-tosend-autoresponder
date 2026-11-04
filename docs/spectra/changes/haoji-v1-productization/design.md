# Design: haoji-v1-productization

> 詳細規格（欄位級、API 級、逐條行為）以 `docs/designs/newsletter-kit-v1-spec.md` 為唯一可信來源。
> 本文只記錄架構決策與接手者需要知道的脈絡。

## 架構決策（已定案，勿再翻案）

| 決策 | 結論 | 理由（金魚審查背書） |
|---|---|---|
| 技術棧 | 沿用 單一 Worker + D1 + 無框架 HTML | 學員維護成本最低；supastarter monorepo 已否決 |
| 登入 | scrypt 密碼 + 32B 隨機 session（單一裝置、滑動 7 天） | 取代 ADMIN_API_KEY；修復空 token 後門 |
| ToSend Key | 存 D1 settings 表，AES-GCM 加密（key=SHA-256(HAOJI_SECRET)） | 學員只需在設定頁填，不接 CF API |
| 標籤 | v1 維持 subscribers.tags 字串欄（`;a;b;` 正規化 + LIKE） | 正規化推 v1.1（關卡 1/4 共識） |
| 設定 UI | 單頁欄位即驗，onboarding_done derived | 四區精靈是過度設計（關卡 4） |
| 部署 | GitHub Actions；D1 由學員 Dashboard 手動建（workflow 不建 DB） | database_id 無法安全回寫 wrangler.jsonc（v3 定案） |
| 群發 | 單批上限 500、逐人寄、429 退避、campaigns.status | Worker wall-clock 上限（關卡 3） |
| Drip | 原子 UPDATE 冪等 + sending 10 分鐘 staleness 回收 | at-least-once，極少數重複為可接受代價 |
| AI 功能 | v1 不做；repo 用 AGENTS.md + 檔首註解達成 AI 友善 | Workers AI 寫信 = v1.1 免費更新 |

## 安全規格（照抄規格書 §7.4，不得憑感覺改）

- scrypt：N=16384, r=8, p=1, salt=16B, dkLen=32；格式 `scrypt:N:r:p:saltB64:hashB64`
- AES-GCM：key=importKey('raw', SHA-256(UTF-8(HAOJI_SECRET)))；輸出 `base64(iv):base64(ct含16B authTag)`
- setup-password 僅密碼未建立時可用；失敗 5 次鎖 10 分鐘；成功後永久關閉
- 唯讀保留鍵：admin_password_hash / admin_session_token / admin_session_updated_at / onboarding_done → settings API 寫入一律 403
- GET settings 對加密鍵永不回明文

## 資料庫

- 首支 migration `migrations/0000_init.sql` = 完整建表（4 既有 + settings），時間欄統一 `strftime('%Y-%m-%dT%H:%M:%SZ','now')`
- settings 鍵清單 = 規格書 §4 表格（唯一可信來源）

## 檔案行數預算（超過就拆）

index.ts 500 / db.ts 400 / csv.ts 120 / crypto.ts 150 / tosend.ts 130 / drip.ts 120 / page.ts 400 / adminHtml.ts 1400（超過拆 admin/ 子模組）

## 已知的現行必修缺陷（不得照抄）

1. `src/index.ts` 登入空 token 後門（`|| expectedToken`）
2. Cookie 存 API Key 本體
3. 無密碼機制

## 交付物清單（完成定義）

- [ ] 本 repo 全部 tasks 完成、測試全綠、`spectra validate` 通過
- [ ] 新建 private repo `haoji-newsletter`：乾淨歷史、排除 `docs/references/pluck/`、排除 `.dev.vars`、移除「Plunk」字樣註解、加買斷授權條款 LICENSE
- [ ] README（學員開箱）+ AGENTS.md（AI 導讀）
