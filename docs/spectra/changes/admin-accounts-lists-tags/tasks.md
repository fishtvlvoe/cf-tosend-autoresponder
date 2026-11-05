# Tasks：管理員帳號＋名單（Lists）＋標籤（Tags）管理

## A. 帳號與個人設定
- [x] settings 白名單新增 `admin_email`（寫入保護改為只擋 `admin_password_hash`/`onboarding_done`）
- [x] 設定頁「帳號」卡片：登入 Email（儲存）＋修改密碼（橫排按鈕）

## B. 名單（Lists）
- [x] migration `0002_lists_tags.sql`：`lists`＋`subscriber_lists`（本機 D1 已套用）
- [x] db.ts：listLists/createList/renameList/deleteList（刪除只移除歸屬）
- [x] API：GET/POST/PUT/DELETE `/api/admin/lists`
- [x] UI：⋯更多選單「管理名單」Modal（建立/改名/刪除/人數）
- [x] UI：聯絡人表格新增「名單」欄（中性灰徽章）

## C. 標籤（Tags）
- [x] migration：`tags`（color）＋`subscriber_tags`（本機 D1 已套用）
- [x] 惰性回填 `ensureListsTagsMigrated()`（顏色依首次出現輪替色盤）
- [x] db.ts：listTagObjects/findOrCreateTag/renameTag/setTagColor/deleteTag（刪除同步撕掉）
- [x] API：GET（含 id/color/count）/POST/PUT/DELETE `/api/admin/tags`
- [x] UI：⋯更多選單「管理標籤」Modal
- [x] UI：彩色標籤徽章（DESIGN.md 馬卡龍色盤）

## D. 聯絡人歸屬與篩選
- [x] 聯絡人 GET 回傳 lists/tags_arr 陣列；POST/PUT 支援 listIds/tagNames（dual-write legacy tags 字串）
- [x] 篩選區改兩行搜尋框式多選（名單/標籤），打字過濾＋即建，聯集過濾
- [x] 新增/編輯聯絡人改 Modal（選取膠囊：未選淺灰／已選實心黑）

## E. 廣播受眾
- [x] campaigns/send 支援 `target_type: 'audience'`（listIds 聯集＋includeTagIds AND−excludeTagIds）
- [x] UI：自訂受眾（下拉勾選名單／標籤要有、排除 → 膠囊顯示）

## F. 驗證
- [x] `npm test` 42/42（新增 4 項：名單 CRUD／標籤 CRUD＋輪色／聯絡人歸屬／受眾寄送）
- [x] `npx tsc --noEmit` 乾淨
- [ ] 實機走查（老魚三裝置驗收）
