import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import worker from '../src/index';

function createMockD1Database(db: any): any {
  return {
    prepare(sql: string) {
      let boundParams: any[] = [];
      return {
        bind(...params: any[]) {
          boundParams = params;
          return this;
        },
        async first<T = any>() {
          const stmt = db.prepare(sql);
          return (stmt.get(...boundParams) as T) || null;
        },
        async all<T = any>() {
          const stmt = db.prepare(sql);
          return { results: stmt.all(...boundParams) as T[] };
        },
        async run() {
          const stmt = db.prepare(sql);
          const info = stmt.run(...boundParams);
          return { meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        },
      };
    },
    async batch(statements: any[]) {
      const results = [];
      for (const s of statements) {
        results.push(await s.run());
      }
      return results;
    },
  };
}

describe('TDD 完整驗收套件：驗收卡 V1 ~ V5 全綠驗證', () => {
  let sqlite: any;
  let mockD1: any;
  let env: any;
  let ctx: any;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    const schemaSql = readFileSync(join(__dirname, '../schema.sql'), 'utf-8');
    sqlite.exec(schemaSql);
    mockD1 = createMockD1Database(sqlite);
    env = {
      DB: mockD1,
      APP_URL: 'https://test-worker.workers.dev',
      ADMIN_API_KEY: 'test-admin-secret',
    };
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    };
  });

  // V1: 正常訂閱端點
  it('[V1] 正常訂閱應回傳 200 並寫入 D1 subscribers (status = active)', async () => {
    const req = new Request('https://test-worker.workers.dev/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user1@example.com', name: 'User One' }),
    });

    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);

    const saved = sqlite.prepare('SELECT * FROM subscribers WHERE email = ?').get('user1@example.com');
    expect(saved).toBeDefined();
    expect(saved.name).toBe('User One');
    expect(saved.status).toBe('active');
    expect(saved.unsubscribe_token).toHaveLength(36); // UUID
  });

  // V2: Honeypot 機器人蜜罐防禦
  it('[V2] 帶有 hp_company 的機器人請求應靜默成功，但完全不寫入 D1', async () => {
    const req = new Request('https://test-worker.workers.dev/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'spam_bot@example.com',
        name: 'Spam Bot',
        hp_company: 'Malicious Corp Ltd',
      }),
    });

    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);

    // 關鍵斷言：資料庫必須是 0 筆！
    const saved = sqlite.prepare('SELECT * FROM subscribers WHERE email = ?').get('spam_bot@example.com');
    expect(saved).toBeUndefined();
  });

  // V3: 退訂雙重防護 (GET 帶確認頁面不變更狀態，POST 才執行變更)
  it('[V3] GET 請求時不更動狀態，POST 請求時才將 status 改為 unsubscribed', async () => {
    // 先寫入一名活躍訂閱者
    const dbService = new DatabaseService(mockD1);
    const { subscriber } = await dbService.upsertSubscriber('target@example.com', 'Target');

    // 1. 模擬防毒安全爬蟲 GET 預讀 (SafeLinks / Virus Scanner)
    const getReq = new Request(`https://test-worker.workers.dev/unsubscribe?token=${subscriber.unsubscribe_token}`, {
      method: 'GET',
    });
    const getRes = await worker.fetch(getReq, env, ctx);
    expect(getRes.status).toBe(200);
    const htmlText = await getRes.text();
    expect(htmlText).toContain('確定要取消訂閱嗎？');

    // 確認資料庫狀態依然保持 active
    let check = sqlite.prepare('SELECT status FROM subscribers WHERE id = ?').get(subscriber.id);
    expect(check.status).toBe('active');

    // 2. 模擬用戶點擊按鈕或 RFC 8058 POST
    const postReq = new Request(`https://test-worker.workers.dev/api/unsubscribe?token=${subscriber.unsubscribe_token}`, {
      method: 'POST',
    });
    const postRes = await worker.fetch(postReq, env, ctx);
    expect(postRes.status).toBe(200);

    // 確認此時資料庫已真正改為 unsubscribed
    check = sqlite.prepare('SELECT status FROM subscribers WHERE id = ?').get(subscriber.id);
    expect(check.status).toBe('unsubscribed');
  });

  // V4: 排程發信強過濾 (已退訂者 100% 阻斷)
  it('[V4] Drip 排程引擎在發送 Step 2 時，必須 100% 排除已退訂者', async () => {
    const dbService = new DatabaseService(mockD1);

    // 插入正常訂閱者與已退訂者
    sqlite.prepare(`
      INSERT INTO subscribers (id, email, name, status, unsubscribe_token, current_step, created_at)
      VALUES 
        (101, 'unsub_user@example.com', 'Unsub', 'unsubscribed', 'tok-u1', 0, datetime('now', '-25 hours')),
        (102, 'valid_user@example.com', 'Valid', 'active', 'tok-v1', 0, datetime('now', '-25 hours'))
    `).run();

    // 查詢 Step 1 (0 小時延遲) 待寄名單
    const pending = await dbService.getPendingSubscribersForStep(1, 0, 50);
    const emails = pending.map((p) => p.email);

    expect(emails).toContain('valid_user@example.com');
    expect(emails).not.toContain('unsub_user@example.com');
  });

  // V5: 發信失敗記錄與重試
  it('[V5] 寄送失敗應能正確寫入 delivery_logs 並保留錯誤訊息供後續排程追蹤', async () => {
    const dbService = new DatabaseService(mockD1);
    const { subscriber } = await dbService.upsertSubscriber('error_prone@example.com');

    await dbService.recordFailureLog(subscriber.id, 1, 'ToSend Connection Timeout 504');

    const log = sqlite.prepare('SELECT * FROM delivery_logs WHERE subscriber_id = ?').get(subscriber.id);
    expect(log).toBeDefined();
    expect(log.status).toBe('failed');
    expect(log.error_message).toContain('504');
  });
});
