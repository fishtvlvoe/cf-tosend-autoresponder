# 好寄（Hokya）— 零月費電子報自架包

一次買斷的電子報系統：收名單、寄信、排程跟進，全繁中，跑在你自己的 Cloudflare 免費帳號裡。

## 你會得到什麼

- 訂閱著陸頁（文案隨你改）＋ 自動歡迎信 ＋ 3 關排程跟進信
- 全繁中後台：名單管理、標籤分眾、CSV 匯入匯出、寄信紀錄
- 依標籤群發、手動單發、測試信
- 一鍵退訂（RFC 8058）＋ 退信自動標記，保護你的寄信評分
- 全套程式碼歸你，可丟給 AI（Claude Code / Cursor）自由改造

## 開箱三步驟（約 30 分鐘，全程不用寫程式）

### 步驟 0：準備三個免費帳號
1. [GitHub](https://github.com)（你已經有，這份 repo 就是證明）
2. [Cloudflare](https://dash.cloudflare.com)（免費方案即可）
3. [ToSend](https://tosend.com)（寄信服務，有免費額度）

另外需要一個**寄信專用網域**（一年約 NT$350，任何註冊商皆可；教學示範在 Cloudflare Registrar 購買）。

### 步驟 1：建資料庫（僅首次，30 秒）
Cloudflare Dashboard → 左側 **D1** → **Create database** → 命名 `autoresponder_db` → 把畫面上的 **database_id** 抄下來，貼進本 repo 的 `wrangler.jsonc`。

### 步驟 2：一鍵部署
1. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**，設三個：
   - `CLOUDFLARE_API_TOKEN`：Cloudflare → My Profile → API Tokens → Create Token（權限選 Edit Cloudflare Workers）
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare Dashboard 右下角
   - `HAOJI_SECRET`：**至少 32 字元的隨機字串**（用密碼管理器產生。⚠️ 請勿重設，重設會讓已存的 ToSend 金鑰失效）
2. 上方 **Actions** → **Deploy** → **Run workflow**
3. 等綠燈，你的網址就是 `https://<worker名稱>.<你的帳號>.workers.dev`

### 步驟 3：完成設定
1. 開 `https://你的網址/login` → 首次會引導你**建立管理密碼**
2. 進後台「設定」頁：填網域、寄件人、ToSend API Key（按「驗證並儲存」會寄測試信，收到信才算完成）
3. 到 ToSend Dashboard → Domains → 加入你的網域並設好 DKIM/SPF/MX（教學影片帶你做）
4. 打開你的網址，用測試信箱訂閱——歡迎信應該 30 秒內抵達 🎉

## 每月成本（真的接近零）

| 項目 | 費用 |
|---|---|
| Cloudflare（系統本體） | 免費額度內（500 人名單綽綽有餘） |
| ToSend（寄信） | 依用量，有免費額度 |
| 你的網域 | 一年約 NT$350 |

> 查證日期 2026-11-05：Workers 免費 10 萬請求/天、D1 免費 5GB、Workers AI 免費 1 萬 Neurons/天。

## 忘記密碼怎麼辦？

不用寫程式：Cloudflare Dashboard → D1 → `autoresponder_db` → 資料表 `settings` → 刪除 `admin_password_hash` 那一列 → 回到 `/login` 重新建立密碼。

## ⚠️ 兩個紅線

1. **本 repo 絕對不可設為 Public**——裡面沒有金鑰，但公開後任何人都能複製你的系統。
2. **不要重設 `HAOJI_SECRET`**——已加密的 ToSend 金鑰會解不開。真的設錯了也沒關係：後台「設定」頁會提示，按「清除重設」再驗證一次就好。

## 常見問題

**Q：我要會寫程式嗎？**
不用。部署是網頁按鈕，設定是中文表單。想改功能時，把 repo 丟給你的 AI 助手（它有 `AGENTS.md` 導讀）說人話就好。

**Q：我的名單在 ConvertKit，搬得過來嗎？**
可以。ConvertKit 匯出 CSV → 後台「聯絡人」頁按「匯入 CSV」。

**Q：寄信會被當垃圾信嗎？**
你的寄信信用累積在自己的網域上，系統自動附一鍵退訂、自動標記退信。正常經營不濫發，規則在你身上。

## 授權

購買者永久使用，可自由修改、可商用；**不可整份轉售或公開散佈**。未來更新免費。
