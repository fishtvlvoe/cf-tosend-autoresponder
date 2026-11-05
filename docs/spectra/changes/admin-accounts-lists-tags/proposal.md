# Change: 管理員帳號＋名單（Lists）＋標籤（Tags）管理

## Why（背景）

老魚 2026-11-05 實機驗收回饋，兩個功能缺口：

1. **個人帳號設定不足**：目前只有「修改密碼」。缺少：登入 Email 信箱設定、其他基礎個人設定；也無法新增其他管理員（雖然主打個人使用，但要保留擴充能力）。
2. **名單頁缺少 Lists／Tags 管理**：目前聯絡人只有「標籤分類」篩選下拉，無法建立/編輯/刪除標籤，也沒有名單（Lists，FluentCRM 式的大分組）概念。使用者要整理訂閱者時沒有工具。

參考設計：FluentCRM（`docs/references/fluent-crm`）有 Subscribers / Lists / Tags 三層。
UI 架構參考：`C-客戶專案/bni/agent-saas-demo/admin.html` 左側選單架構。

## What Changes（提案內容，待對焦後細化）

### A. 帳號與個人設定
- 新增「帳號」區塊（設定頁內或獨立選單項）：
  - 管理員登入 Email（顯示用/未來通知用）
  - 修改密碼（已有，搬入或保留）
  - 其他基礎設定（顯示名稱等）
- 多管理員（簡易版）：可新增/停用管理員帳號（Email＋密碼），角色先不做分層（v1 單一角色 admin）。

### B. 名單（Lists）
- 新資料表 `lists`（id、name、description、created_at）
- 聯絡人與名單多對多：`list_subscribers`
- UI：名單頁新增「名單」管理（建立/重新命名/刪除），聯絡人可歸屬多個名單

### C. 標籤（Tags）
- 目前 tags 是 subscribers 上的分號字串；升級為獨立 `tags` 表＋多對多 `subscriber_tags`（或先保留字串、只做 CRUD UI——**實作方式待對焦**）
- UI：標籤建立/改名/刪除（刪除時同步從聯絡人身上移除）

## 待老魚拍板 → 2026-11-05 已全數定案

1. 多管理員：**不做**。v1 只做個人設定（登入 Email＋修改密碼）。
2. Tags 存法：**獨立表派**。tags 表＋subscriber_tags 多對多；subscribers.tags 字串保留 dual-write 向後相容；舊資料由 `ensureListsTagsMigrated()` 惰性回填。
3. Lists vs Tags 區分：名單＝大分組（中性灰徽章）、標籤＝彩色便利貼（馬卡龍 8 色自動輪替，淺底深字同色淡框，見 DESIGN.md 4.2）。
4. 篩選互動：兩行搜尋框式多選（第一行名單、第二行標籤），多選過濾＝**聯集**。
5. 廣播受眾：下拉勾選（名單複選；標籤分要有／排除）→ 膠囊顯示；受眾語意＝名單聯集 ＋ 要有標籤（AND） − 排除標籤。

## Impact
- 受影響：schema.sql（新表）、db.ts、index.ts（新 API）、adminHtml.ts（新 UI）、測試
- 無影響：前台訂閱流程、寄信引擎
