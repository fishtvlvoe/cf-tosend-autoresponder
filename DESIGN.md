# 好寄（Hokya）UI/UX 設計風格檔

> 好寄 = 買斷制電子報自架包（Cloudflare Workers + D1 + ToSend）的管理後台與前台訂閱頁。
> 本檔是唯一的 UI 風格 SSOT：新增/修改任何介面必須遵守本檔，禁止在個別頁面自創第三套樣式。

## 1. 設計定位

- 語言：繁體中文（台灣用語），品牌中文「好寄」、英文「hokya」。文案直接用「好寄」，不強調英文拼法。
- 氣質：安靜、可信、工具感。像一本乾淨的筆記本，不像行銷落地頁。
- 參考對象：FluentCRM 的資訊密度＋ Notion 的留白比例。
- 技術面：Tailwind CSS（CDN），核心色 = Tailwind `stone` 色階，客製底色 `#fcfbf9`。

## 2. 色票

| 用途 | 值 | Tailwind |
|---|---|---|
| 頁面底色 | `#fcfbf9` | `bg-[#fcfbf9]` |
| 卡片底色 | `#ffffff` | `bg-white` |
| 主文字 | `#1c1917` | `text-stone-900` |
| 次要文字 | `#57534e` | `text-stone-600` |
| 輔助/說明小字 | `#a8a29e` | `text-stone-400` |
| 邊框 | `#e7e5e4` | `border-stone-200` |
| 主按鈕（CTA） | 底 `#1c1917` 字 `#ffffff` | `bg-stone-900 text-white` |
| 次要按鈕 | 底 `#f5f5f4` 字 `#57534e` | `bg-stone-100 text-stone-600` |
| 成功狀態 | `#059669` | `text-emerald-600` |
| 危險操作（刪除） | 預設 `stone` 系，hover 才 `text-red-600` | `hover:!text-red-600` |

禁止：stone 色系以外的任何顏色（成功/危險狀態除外）。禁止漸層、陰影堆疊、彩色 icon。

## 3. 字體與排版

- 字體堆疊：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif`
- 標題：頁標題 `text-lg font-semibold`；區塊標題 `text-sm font-semibold text-stone-700`
- 表格列文字 `text-sm`；輔助說明 `text-[11px] text-stone-400`
- 說明性小字原則上**不出現**——畫面要自解釋，靠操作不需要靠解釋。

## 4. 元件規範

### 4.1 按鈕與選取膠囊

- **文字 ≤ 4 個字**（「儲存」「匯出」「改名」「刪除」）。
- 能用 SVG icon 取代文字就用 icon；icon-only 按鈕可接受（⋯三點、✕關閉）。
- 動作按鈕樣式一律膠囊 chip 形（`rounded-full border px-3 py-1 text-xs`）；主動作才用 `bg-stone-900` 實心。
- **選取膠囊**（modal 內多選、搜尋框已選）：`rounded-full text-xs px-3 py-1`，未選＝`bg-stone-100 text-stone-500` 無邊框；已選＝`bg-stone-900 text-white` 實心膠囊。**不套用動作按鈕的 border 樣式**（語意不同：這是狀態、不是動作）。

### 4.2 徽章（Badge）—— 名單與標籤的區分

| 類型 | 樣式 | 視覺記號 |
|---|---|---|
| 名單（Lists） | `bg-[#f5f5f4] border border-stone-200 text-stone-700`、圓角 6px | 無 |
| 標籤（Tags） | 同上＋前置 5px 灰色小圓點 | `::before` 圓點 |

- 禁止實心黑膠囊當資料徽章；黑色只留給「可點按的東西」（按鈕、已選膠囊）。
- 深色系預留：徽章結構固定為「muted 底 ＋ border ＋ foreground 字」，對比至少 4.5:1，深淺色各驗一次。

### 4.3 多選搜尋框（名單/標籤選擇器）

- 預設是**空搜尋框**，不預列全部選項（選項上百個也不爆版）。
- 點框或打字即過濾；第一列永遠是「全部（共 N 個名單）」，數字是**選項數**不是人數。
- 打字無匹配 → 出現「＋ 建立『關鍵字』」即建即選。
- 已選項目變成黑色膠囊塞在框內，可 ✕ 移除。
- 多選過濾語意 = **聯集**（符合任一即列出）。

### 4.4 下拉勾選（廣播受眾）

- 受眾選擇：下拉裡勾選（名單複選；標籤分「要有／排除」兩區），選完在上方顯示膠囊，可 ✕ 移除。
- 排除標籤的膠囊用虛線框樣式與「有」區分。

### 4.5 Modal

- `rounded-2xl`、白底、右上角「關閉」chip、遮罩點擊可關。
- 內容表單欄位順序：文字欄 → 名單勾選 → 標籤勾選 → 主按鈕。

### 4.6 圖示

- 一律 SVG（`fill="none" stroke-width="1.5"` Heroicons 風格），**禁止 Emoji 當圖示**。

## 5. 版面架構

### 5.1 管理後台

```
桌面（≥md）：左側邊欄 13rem（可收合至 3.25rem，icon-only）＋ 內容區 max-w-6xl
手機（<md）：頂欄 ＋ 漢堡抽屜選單
```

- 選單項（五項）：總覽／名單／廣播／排程／設定。
- 頂欄只放：品牌（寄字章＋好寄）／執行排程按鈕／登出。不秀技術名詞（Workers、D1、ToSend、REST API 一律不出現）。
- 聯絡人頁篩選區固定兩行：第一行「名單」＋「＋新增」「⋯」；第二行「標籤」。
- 次要功能（管理名單、管理標籤、匯出、匯入）收在「⋯」更多選單。

### 5.2 表格 → 卡片

- 桌面：`grid-cols-12` 表格；手機：同一列 `grid-cols-2` 改卡片式堆疊，不可橫向捲動。
- 空狀態：置中 `text-stone-400`，不彈 alert。

## 6. 深色模式（預留）

- 全部色彩走「語意變數」：`surface / card / muted / border / foreground`。
- 導入深色系時，先定義 `:root[data-theme="dark"]` 的 token，徽章與按鈕自動映射，逐頁截圖驗收（淺色、深色各一張，沒有深色截圖不算通過）。

## 7. 相關文件

- 行動裝置驗收卡：`docs/designs/uiux-mobile-acceptance.md`
- 名單/標籤互動設計稿：`docs/designs/lists-tags-demo.html`
- UI 架構參考：`C-客戶專案/bni/agent-saas-demo/admin.html`（左選單＋內容）
- 修改本檔後，同步檢查 `src/adminHtml.ts`、`src/page.ts` 是否一致。

---

*好寄 DESIGN.md v1.0.0 ｜ 2026-11-05*
