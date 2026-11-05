-- ========================================================
-- Cloudflare D1 Schema for cf-tosend-autoresponder
-- ========================================================

-- 1. 訂閱者名單
CREATE TABLE IF NOT EXISTS subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    tags TEXT DEFAULT '一般訂閱', -- 標籤分類：VIP, 潛在客戶, 一般訂閱
    status TEXT DEFAULT 'active', -- active, unsubscribed, bounced, complained
    unsubscribe_token TEXT UNIQUE NOT NULL,
    current_step INTEGER DEFAULT 0, -- 目前已完成的序號步驟
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscribers_status ON subscribers(status);
CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_subscribers_tags ON subscribers(tags);

-- 2. 自動化郵件序列 (Autoresponder Sequences)
CREATE TABLE IF NOT EXISTS email_sequences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    step_number INTEGER UNIQUE NOT NULL, -- 第 1 封、第 2 封、第 3 封...
    delay_hours INTEGER NOT NULL,        -- 距離訂閱時間（created_at）延遲幾小時後寄出（0 表示立即發送歡迎信）
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sequences_step ON email_sequences(step_number);

-- 3. 電子報廣播信 (Campaign Broadcasts)
CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    target_type TEXT DEFAULT 'all', -- all, tag, manual
    target_tag TEXT DEFAULT '',
    sent_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'done', -- done / partial / failed
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 發信日誌
CREATE TABLE IF NOT EXISTS delivery_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subscriber_id INTEGER NOT NULL,
    sequence_id INTEGER DEFAULT 0,
    tosend_message_id TEXT,
    status TEXT DEFAULT 'sent', -- sent, failed
    error_message TEXT,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subscriber_id) REFERENCES subscribers(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_logs_sub ON delivery_logs(subscriber_id);

-- 預載預設 3 封序列示範
INSERT OR IGNORE INTO email_sequences (step_number, delay_hours, subject, content_html)
VALUES 
(
    1, 
    0, 
    '歡迎訂閱！這是你的第一份專屬精選指南', 
    '<p>嗨 <strong>{{name}}</strong>，</p><p>非常感謝你的訂閱！這是你在註冊後立即收到的第一份歡迎信。</p><p>在接下來的幾天裡，我會與你分享最實用的自動化技巧與精選案例。</p><p>祝順心！</p>'
),
(
    2, 
    24, 
    '第 2 天跟進：核心觀念與最常見的 3 個誤區', 
    '<p>嗨 <strong>{{name}}</strong>，</p><p>距離你訂閱已經過了 24 小時。今天想跟你聊聊在進行郵件自動化時，最常見的 3 個盲點...</p><p>希望對你有幫助！</p>'
),
(
    3, 
    72, 
    '第 4 天深度解析：實戰案例分享', 
    '<p>嗨 <strong>{{name}}</strong>，</p><p>這是我們為你準備的深度實戰案例解析。透過這套流程，團隊省下了超過 80% 的手動溝通時間...</p><p>有任何問題隨時回覆這封信與我討論！</p>'
);

-- 系統設定表（key-value；is_encrypted=1 的鍵存 AES-GCM 密文）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  is_encrypted INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

-- 5. 名單（Lists）：大分組（電子報主名單、課程學員…）
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

-- 6. 標籤（Tags）：彩色便利貼；color 對應 DESIGN.md 馬卡龍色盤
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
