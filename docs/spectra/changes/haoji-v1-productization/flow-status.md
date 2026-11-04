# Flow Status: haoji-v1-productization

| 欄位 | 內容 |
|---|---|
| 目前步驟 | apply（實作階段，Phase 1 安全地基） |
| 上一個步驟 | propose + 金魚五關兩輪 review 已完成（規格書 Approved） |
| 規格書 | docs/designs/newsletter-kit-v1-spec.md |
| 下一步行動 | 依 tasks.md Phase 1 → 6 順序實作；任何代理接手先讀 proposal.md 與規格書 |

## 接手須知（給任何 AI / 代理）

1. 規格書 `docs/designs/newsletter-kit-v1-spec.md` 是**唯一可信來源**，逐條照做，勿憑感覺改安全參數
2. 每個 task 勾選前必須：code + focused test + 行為驗證（Gherkin 對應者需 e2e 通過）
3. 額度或 session 中斷不影響接手：git log + 本 tasks.md 即為完整狀態
4. 銷售頁在另一 repo：`B-產品/hokya/`（好寄/Hokya 銷售頁 + 錄影腳本）
