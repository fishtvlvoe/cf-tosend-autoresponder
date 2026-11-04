# SHOPLINE Payments 串接規格（離線備份）

- **來源**：https://docs.shoplinepayments.com/ （透過 sitemap.xml 全站抓取）
- **抓取日期**：2026-11-05
- **頁數**：102 頁（HTML 原始檔，可用瀏覽器直接開啟閱讀）

## 檔案命名規則

`sitemap 路徑的 / 換成 _`，例如：
- `https://docs.shoplinepayments.com/api/trade/session/` → `api_trade_session.html`
- 首頁 → `index.html`

## 跟我們專案最相關的頁面（賣數位商品 = 導轉式收款 + 付款成功 Webhook）

| 主題 | 檔案 |
|---|---|
| 串接流程總覽（必讀） | `index.html` |
| 導轉式收款指南 | `guide_session.html` |
| 建立結帳 Session（產生付款連結） | `api_trade_session.html` |
| 查詢 Session 狀態 | `api_trade_sessionQuery.html` |
| Webhook 通知機制說明 | `api_event.html` |
| 付款成功 Event 電文格式 | `api_event_model_payment.html` |
| 退款 | `api_trade_refund.html`、`api_trade_refundQuery.html` |
| 錯誤代碼表 | `appendix_errorCode.html` |
| Session 狀態代碼 | `appendix_sessionStatus.html` |
| 支援付款方式 | `overview_supportedPaymentMethod.html`（含 CreditCard、LINE Pay、街口、ATM） |
| 沙盒測試資源 | `overview_sandboxResource.html` |
| 特店註冊指南 | `overview_registerGuide.html` |

## 金鑰（申請後由 SHOPLINE Payments 後台「設定-開發者管理」產生）

| 金鑰 | 用途 |
|---|---|
| apiKey | Server API 串接認證 |
| clientKey | SDK 串接認證（我們用不到，走導轉式） |
| signKey | Webhook Event 通知驗證簽章 |
