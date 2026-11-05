-- ========================================================
-- 0002：Lists / Tags 獨立表（2026-11-05 SR admin-accounts-lists-tags）
-- 名單（Lists）與標籤（Tags）升級為獨立表＋多對多關聯（FluentCRM 式正規化）。
-- 既有 subscribers.tags 字串保留（dual-write 向後相容），
-- 資料回填改由程式端惰性遷移（db.ts ensureListsTagsMigrated）。
-- ========================================================

-- 名單（大分組：電子報主名單、課程學員…）
CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 聯絡人 ↔ 名單 多對多
CREATE TABLE IF NOT EXISTS subscriber_lists (
    subscriber_id INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subscriber_id, list_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriber_lists_list ON subscriber_lists(list_id);

-- 標籤（彩色便利貼；color 對應 DESIGN.md 馬卡龍色盤）
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT 'gray', -- green/blue/yellow/red/purple/pink/orange/gray
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 聯絡人 ↔ 標籤 多對多
CREATE TABLE IF NOT EXISTS subscriber_tags (
    subscriber_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subscriber_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriber_tags_tag ON subscriber_tags(tag_id);
