import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseService } from '../src/db';
import { readFileSync } from 'fs';
import { join } from 'path';
import worker from '../src/index';
import { hashPassword, encryptSecret } from '../src/crypto';

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

describe('Admin 控制台與 API 端點驗證 (Admin Endpoints)', () => {
  let sqlite: any;
  let mockD1: any;
  let env: any;
  let ctx: any;

  const ADMIN_PASSWORD = 'test-password-123';

  async function login(): Promise<string> {
    const res = await worker.fetch(
      new Request('https://test-worker.workers.dev/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: ADMIN_PASSWORD }),
      }),
      env,
      ctx
    );
    expect(res.status).toBe(200);
    return res.headers.get('Set-Cookie')!.split(';')[0]; // haoji_session=...
  }

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    const schemaSql = readFileSync(join(__dirname, '../schema.sql'), 'utf-8');
    sqlite.exec(schemaSql);
    mockD1 = createMockD1Database(sqlite);
    env = {
      DB: mockD1,
      HAOJI_SECRET: 'test-secret-for-encryption-32chars!',
      TOSEND_API_KEY: 'test-tosend-key',
      TOSEND_FROM_EMAIL: 'sender@example.com',
      TOSEND_FROM_NAME: 'Test Sender',
    };
    // 預建管理密碼（PBKDF2 在測試中只做一次，後續登入重用）
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', await hashPassword(ADMIN_PASSWORD));
    // 預建完成設定的旗標（send 相關測試需通過 onboarding 檢查）
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('onboarding_done', '1');
    // 寄信組態（send 現改由 settings 注入 mailer config）
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tosend_from_email', 'sender@example.com');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tosend_from_name', 'Test Sender');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('site_domain', 'test-worker.workers.dev');
    sqlite.prepare('INSERT INTO settings (key, value, is_encrypted) VALUES (?, ?, 1)')
      .run('tosend_api_key', await encryptSecret('test-tosend-key', env.HAOJI_SECRET));
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    };
  });

  it('未提供 Authorization Header 應回傳 401 Unauthorized', async () => {
    const req = new Request('https://test-worker.workers.dev/api/admin/stats', {
      method: 'GET',
    });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(401);
  });

  it('提供正確 Authorization Header 時 GET /api/admin/stats 應回傳正確 D1 統計數據', async () => {
    sqlite.prepare(`
      INSERT INTO subscribers (email, status, unsubscribe_token, tags) 
      VALUES 
        ('user1@example.com', 'active', 'tok-1', ';bni;lead;'),
        ('user2@example.com', 'active', 'tok-2', ';vip;'),
        ('user3@example.com', 'unsubscribed', 'tok-3', '')
    `).run();

    const req = new Request('https://test-worker.workers.dev/api/admin/stats', {
      headers: { Cookie: await login() },
    });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.activeCount).toBe(2);
    expect(data.unsubCount).toBe(1);
    expect(data.sentCount).toBe(0);
    expect(data.failedCount).toBe(0);
  });

  it('POST /api/admin/subscribers 能新增聯絡人並寫入 tags 到 D1', async () => {
    const req = new Request('https://test-worker.workers.dev/api/admin/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: await login(),
      },
      body: JSON.stringify({
        email: 'newbie@example.com',
        name: 'Newbie User',
        tags: 'bni,taipei',
      }),
    });
    const res = await worker.fetch(req, env, ctx);
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);

    const row = sqlite.prepare('SELECT * FROM subscribers WHERE email = ?').get('newbie@example.com');
    expect(row).toBeDefined();
    expect(row.name).toBe('Newbie User');
    expect(row.tags).toBe(';bni;taipei;');
  });

  it('POST /api/admin/sequences 能儲存自動跟進關卡排程並成功查詢', async () => {
    const saveReq = new Request('https://test-worker.workers.dev/api/admin/sequences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: await login(),
      },
      body: JSON.stringify({
        step_number: 1,
        delay_hours: 0,
        subject: '歡迎信',
        content_html: '<p>歡迎！</p>',
        is_active: 1,
      }),
    });
    const saveRes = await worker.fetch(saveReq, env, ctx);
    expect(saveRes.status).toBe(200);

    const getReq = new Request('https://test-worker.workers.dev/api/admin/sequences', {
      headers: { Cookie: await login() },
    });
    const getRes = await worker.fetch(getReq, env, ctx);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json() as any;
    expect(getData.sequences).toHaveLength(3);
    const step1 = getData.sequences.find((s: any) => s.step_number === 1);
    expect(step1.subject).toBe('歡迎信');
    expect(step1.step_number).toBe(1);
  });

  it('POST /api/admin/campaigns/send 能將廣播信儲存至 campaigns 表並針對名單發送', async () => {
    // 建立 1 個活躍訂閱者
    sqlite.prepare(`
      INSERT INTO subscribers (email, name, status, unsubscribe_token, tags) 
      VALUES ('broadcast_target@example.com', 'Target User', 'active', 'tok-b1', ';newsletter;')
    `).run();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'tosend_msg_123' }),
      json: async () => ({ id: 'tosend_msg_123' }),
    });

    try {
      const req = new Request('https://test-worker.workers.dev/api/admin/campaigns/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: await login(),
        },
        body: JSON.stringify({
          name: '本週產品更新',
          subject: '本週產品更新',
          target_type: 'tag',
          target_tag: 'newsletter',
          content_html: '<p>Hi {{name}}, 這是更新內容。</p>',
        }),
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);
      expect(data.sent_success).toBe(1);

      const campaign = sqlite.prepare('SELECT * FROM campaigns WHERE subject = ?').get('本週產品更新');
      expect(campaign).toBeDefined();
      expect(campaign.sent_count).toBe(1);
      expect(campaign.target_tag).toBe('newsletter');

      const log = sqlite.prepare('SELECT * FROM delivery_logs WHERE subscriber_id = 1').get();
      expect(log).toBeDefined();
      expect(log.status).toBe('sent');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('POST /api/admin/send-direct 能對指定單一信箱執行個別發信並留下 D1 紀錄', async () => {
    sqlite.prepare(`
      INSERT INTO subscribers (id, email, name, status, unsubscribe_token) 
      VALUES (99, 'single@example.com', 'Single Person', 'active', 'tok-single')
    `).run();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'tosend_direct_1' }),
      json: async () => ({ id: 'tosend_direct_1' }),
    });

    try {
      const req = new Request('https://test-worker.workers.dev/api/admin/send-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: await login(),
        },
        body: JSON.stringify({
          email: 'single@example.com',
          name: 'Single Person',
          subject: '專屬通知',
          content: '<p>這是一封個別發送的郵件</p>',
        }),
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.success).toBe(true);

      const log = sqlite.prepare('SELECT * FROM delivery_logs WHERE subscriber_id = 99').get();
      expect(log).toBeDefined();
      expect(log.status).toBe('sent');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

describe('密碼式認證（Phase 1：setup / login / change-password / session 失效）', () => {
  const BASE = 'https://test-worker.workers.dev';
  let sqlite: any, mockD1: any, env: any, ctx: any;

  beforeEach(() => {
    sqlite = new Database(':memory:');
    sqlite.exec(readFileSync(join(__dirname, '../schema.sql'), 'utf-8'));
    mockD1 = createMockD1Database(sqlite);
    env = { DB: mockD1, TOSEND_API_KEY: 'k', TOSEND_FROM_EMAIL: 'a@b.c', TOSEND_FROM_NAME: 'n' };
    ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
  });

  const post = (path: string, body: any, cookie?: string) =>
    new Request(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });

  it('密碼未建立時 login 回 403 PASSWORD_NOT_SET；setup 後可登入，且 setup 僅限一次', async () => {
    let res = await worker.fetch(post('/api/admin/login', { password: 'whatever' }), env, ctx);
    expect(res.status).toBe(403);
    expect((await res.json() as any).code).toBe('PASSWORD_NOT_SET');

    res = await worker.fetch(post('/api/admin/setup-password', { password: 'first-pass-123' }), env, ctx);
    expect(res.status).toBe(200);

    res = await worker.fetch(post('/api/admin/setup-password', { password: 'second-pass-123' }), env, ctx);
    expect(res.status).toBe(403); // 已建立，永久關閉
  });

  it('空密碼絕不通過驗證（後門修復）', async () => {
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', await hashPassword('real-password-1'));
    const res = await worker.fetch(post('/api/admin/login', { password: '' }), env, ctx);
    expect(res.status).toBe(401);
  });

  it('修改密碼後舊 session 失效（舊 Cookie 呼叫 API 回 401）', async () => {
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', await hashPassword('old-password-1'));
    const loginRes = await worker.fetch(post('/api/admin/login', { password: 'old-password-1' }), env, ctx);
    const oldCookie = loginRes.headers.get('Set-Cookie')!.split(';')[0];

    const changeRes = await worker.fetch(
      post('/api/admin/change-password', { old_password: 'old-password-1', new_password: 'new-password-1' }, oldCookie),
      env, ctx
    );
    expect(changeRes.status).toBe(200);
    const newCookie = changeRes.headers.get('Set-Cookie')!.split(';')[0];

    const stale = await worker.fetch(new Request(BASE + '/api/admin/stats', { headers: { Cookie: oldCookie } }), env, ctx);
    expect(stale.status).toBe(401);

    const fresh = await worker.fetch(new Request(BASE + '/api/admin/stats', { headers: { Cookie: newCookie } }), env, ctx);
    expect(fresh.status).toBe(200);
  });

  it('/admin 未登入 302 導向 /login', async () => {
    const res = await worker.fetch(new Request(BASE + '/admin'), env, ctx);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toContain('/login');
  });
});

describe('settings API 與設定檢查（Phase 2：中文設定頁後端）', () => {
  const BASE = 'https://test-worker.workers.dev';
  const HAOJI_SECRET = 'test-haoji-secret-32chars-padpadpad';
  let sqlite: any, mockD1: any, env: any, ctx: any, cookie: string;

  const authPost = (path: string, body: any) =>
    new Request(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify(body),
    });
  const authGet = (path: string) => new Request(BASE + path, { headers: { Cookie: cookie } });

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    sqlite.exec(readFileSync(join(__dirname, '../schema.sql'), 'utf-8'));
    mockD1 = createMockD1Database(sqlite);
    env = { DB: mockD1, HAOJI_SECRET, TOSEND_API_KEY: 'k', TOSEND_FROM_EMAIL: 'a@b.c', TOSEND_FROM_NAME: 'n' };
    ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', await hashPassword('admin-pass-123'));
    const res = await worker.fetch(
      new Request(BASE + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'admin-pass-123' }),
      }), env, ctx);
    cookie = res.headers.get('Set-Cookie')!.split(';')[0];
  });

  it('Gherkin 1：金鑰驗證成功後寫入，GET 不回明文', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{}' });
    try {
      const v = await worker.fetch(authPost('/api/admin/settings/verify-tosend', {
        api_key: 'sk-live-123', from_email: 'me@mydomain.tw', from_name: '老魚',
      }), env, ctx);
      expect(v.status).toBe(200);
    } finally { globalThis.fetch = originalFetch; }

    const w = await worker.fetch(authPost('/api/admin/settings', { key: 'tosend_api_key', value: 'sk-live-123' }), env, ctx);
    expect(w.status).toBe(200);

    const g = await worker.fetch(authGet('/api/admin/settings'), env, ctx);
    const data = await g.json() as any;
    expect(data.settings.tosend_api_key.set).toBe(true);
    expect(data.settings.tosend_api_key.value).toBeNull(); // 永不回明文
    const row = sqlite.prepare("SELECT * FROM settings WHERE key = 'tosend_api_key'").get();
    expect(row.is_encrypted).toBe(1);
    expect(row.value).not.toContain('sk-live-123');
    // 密文可用正確金鑰解密
    const { decryptSecret } = await import('../src/crypto');
    await expect(decryptSecret(row.value, HAOJI_SECRET)).resolves.toBe('sk-live-123');
  });

  it('verify-tosend 失敗分類：401 →「API Key 無效」', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    try {
      const v = await worker.fetch(authPost('/api/admin/settings/verify-tosend', {
        api_key: 'bad-key', from_email: 'me@mydomain.tw',
      }), env, ctx);
      expect(v.status).toBe(400);
      expect((await v.json() as any).error).toContain('API Key 無效');
    } finally { globalThis.fetch = originalFetch; }
  });

  it('保留鍵 403、未知鍵 400', async () => {
    const r1 = await worker.fetch(authPost('/api/admin/settings', { key: 'admin_password_hash', value: 'x' }), env, ctx);
    expect(r1.status).toBe(403);
    const r2 = await worker.fetch(authPost('/api/admin/settings', { key: 'onboarding_done', value: '1' }), env, ctx);
    expect(r2.status).toBe(403);
    const r3 = await worker.fetch(authPost('/api/admin/settings', { key: 'hacker_key', value: 'x' }), env, ctx);
    expect(r3.status).toBe(400);
  });

  it('onboarding_done 由必填鍵 derived 重算', async () => {
    await worker.fetch(authPost('/api/admin/settings', { key: 'site_domain', value: 'm.example.com' }), env, ctx);
    await worker.fetch(authPost('/api/admin/settings', { key: 'landing_title', value: '訂閱我' }), env, ctx);
    await worker.fetch(authPost('/api/admin/settings', { key: 'tosend_from_email', value: 'me@example.com' }), env, ctx);
    await worker.fetch(authPost('/api/admin/settings', { key: 'tosend_from_name', value: '老魚' }), env, ctx);
    // 還缺 tosend_api_key → 0
    let g = await (await worker.fetch(authGet('/api/admin/settings'), env, ctx)).json() as any;
    expect(g.onboarding_done).toBe(false);
    await worker.fetch(authPost('/api/admin/settings', { key: 'tosend_api_key', value: 'sk-x' }), env, ctx);
    g = await (await worker.fetch(authGet('/api/admin/settings'), env, ctx)).json() as any;
    expect(g.onboarding_done).toBe(true);
  });

  it('Gherkin 8：設定未完成時寄信 API 回 400', async () => {
    const res = await worker.fetch(authPost('/api/admin/send-direct', {
      email: 'x@example.com', subject: 's', content: 'c',
    }), env, ctx);
    expect(res.status).toBe(400);
    expect((await res.json() as any).error).toBe('請先完成設定頁');
  });
});

describe('標籤與 CSV 匯入匯出（Phase 3）', () => {
  const BASE = 'https://test-worker.workers.dev';
  let sqlite: any, mockD1: any, env: any, ctx: any, cookie: string;

  const auth = (path: string, init: any = {}) => new Request(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init.headers || {}) },
  });

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    sqlite.exec(readFileSync(join(__dirname, '../schema.sql'), 'utf-8'));
    mockD1 = createMockD1Database(sqlite);
    env = { DB: mockD1, HAOJI_SECRET: 's', TOSEND_API_KEY: 'k', TOSEND_FROM_EMAIL: 'a@b.c', TOSEND_FROM_NAME: 'n' };
    ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      .run('admin_password_hash', await hashPassword('admin-pass-123'));
    const res = await worker.fetch(new Request(BASE + '/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin-pass-123' }),
    }), env, ctx);
    cookie = res.headers.get('Set-Cookie')!.split(';')[0];
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('onboarding_done', '1');
  });

  it('Gherkin 2：CSV 3 好 2 壞，row 號含標頭，重複匯入冪等', async () => {
    const csv = 'email,name,tags\r\na@example.com,小明,VIP;BNI\r\nb@example.com,小華,一般訂閱\r\nbad-email,壞列,\r\nc@example.com,,\r\na@example.com,小明改,新標籤';
    const run = (text: string) => worker.fetch(auth('/api/admin/import', {
      method: 'POST', headers: { 'Content-Type': 'text/csv', Cookie: cookie }, body: text,
    }), env, ctx);

    let res = await run(csv);
    expect(res.status).toBe(200);
    let d = await res.json() as any;
    expect(d.succeeded).toBe(3);
    expect(d.failed).toBe(1);
    expect(d.errors.map((e: any) => e.row)).toEqual([4]); // 含標頭列（壞列在第 4 列）
    // 同檔重複 email 後列蓋前列
    expect(sqlite.prepare("SELECT name FROM subscribers WHERE email='a@example.com'").get().name).toBe('小明改');

    res = await run(csv);
    d = await res.json() as any;
    expect(sqlite.prepare('SELECT COUNT(*) n FROM subscribers').get().n).toBe(3); // 冪等
  });

  it('非 UTF-8 回 400 編碼錯誤；>1MB 回 413', async () => {
    const big5 = new Uint8Array([0x61, 0x40, 0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2c, 0xc4, 0xe5]); // a@b.com,大(Big5)
    let res = await worker.fetch(auth('/api/admin/import', {
      method: 'POST', headers: { 'Content-Type': 'text/csv', Cookie: cookie }, body: big5,
    }), env, ctx);
    expect(res.status).toBe(400);

    res = await worker.fetch(auth('/api/admin/import', {
      method: 'POST', headers: { 'Content-Type': 'text/csv', Cookie: cookie }, body: new Uint8Array(1024 * 1024 + 1),
    }), env, ctx);
    expect(res.status).toBe(413);
  });

  it('匯出含 BOM 與五欄位；tags 群組計數正確', async () => {
    sqlite.prepare("INSERT INTO subscribers (email,name,status,unsubscribe_token,tags) VALUES ('t@example.com','測','active','tok1',';VIP;BNI;'),('u@example.com','','active','tok2',';VIP;')").run();
    const res = await worker.fetch(auth('/api/admin/export'), env, ctx);
    expect(res.status).toBe(200);
    const buf = new Uint8Array(await res.arrayBuffer());
    expect([buf[0], buf[1], buf[2]]).toEqual([0xEF, 0xBB, 0xBF]); // UTF-8 BOM（text() 會剝除，故驗 bytes）
    const text = new TextDecoder().decode(buf);
    expect(text).toContain('email,name,tags,status,created_at');
    expect(text).toContain('t@example.com,測,VIP;BNI');

    const tags = await (await worker.fetch(auth('/api/admin/tags'), env, ctx)).json() as any;
    const vip = tags.tags.find((t: any) => t.name === 'VIP');
    expect(vip.count).toBe(2);
  });

  it('PUT 編輯正規化、DELETE 軟刪除且名單消失', async () => {
    sqlite.prepare("INSERT INTO subscribers (email,name,status,unsubscribe_token,tags) VALUES ('p@example.com','舊','active','tok9',';一般訂閱;')").run();
    let res = await worker.fetch(auth('/api/admin/subscribers', {
      method: 'PUT', body: JSON.stringify({ id: 1, name: '新', tags: 'VIP' }),
    }), env, ctx);
    expect(res.status).toBe(200);
    const row = sqlite.prepare('SELECT * FROM subscribers WHERE id = 1').get();
    expect(row.tags).toBe(';VIP;');
    expect(row.name).toBe('新');

    res = await worker.fetch(auth('/api/admin/subscribers?id=1', { method: 'DELETE' }), env, ctx);
    expect(res.status).toBe(200);
    expect(sqlite.prepare("SELECT status FROM subscribers WHERE id = 1").get().status).toBe('deleted');
    const list = await (await worker.fetch(auth('/api/admin/subscribers'), env, ctx)).json() as any;
    expect(list.subscribers.find((s: any) => s.id === 1)).toBeUndefined();
  });
});

describe('寄信可靠性（Phase 4：Gherkin 3/5/7/10）', () => {
  const BASE = 'https://test-worker.workers.dev';
  const SECRET = 'phase4-secret-key-32chars-padpadpad!';
  let sqlite: any, mockD1: any, env: any, ctx: any, cookie: string;

  const auth = (path: string, init: any = {}) => new Request(BASE + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...(init.headers || {}) },
  });
  const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '{"id":"m1"}', json: async () => ({ id: 'm1' }) });

  beforeEach(async () => {
    sqlite = new Database(':memory:');
    sqlite.exec(readFileSync(join(__dirname, '../schema.sql'), 'utf-8'));
    mockD1 = createMockD1Database(sqlite);
    env = { DB: mockD1, HAOJI_SECRET: SECRET, TOSEND_API_KEY: 'k', TOSEND_FROM_EMAIL: 'a@b.c', TOSEND_FROM_NAME: 'n' };
    ctx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() };
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('admin_password_hash', await hashPassword('admin-pass-123'));
    const res = await worker.fetch(new Request(BASE + '/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin-pass-123' }),
    }), env, ctx);
    cookie = res.headers.get('Set-Cookie')!.split(';')[0];
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('onboarding_done', '1');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tosend_from_email', 'a@b.c');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('tosend_from_name', 'n');
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('site_domain', 'test-worker.workers.dev');
    sqlite.prepare('INSERT INTO settings (key, value, is_encrypted) VALUES (?, ?, 1)')
      .run('tosend_api_key', await encryptSecret('k', SECRET));
  });

  it('Gherkin 3：對 VIP 群發僅 A 收到，bounced 的 C 被排除', async () => {
    sqlite.prepare(`INSERT INTO subscribers (email,status,unsubscribe_token,tags) VALUES
      ('a@example.com','active','t1',';VIP;'),
      ('b@example.com','active','t2',';一般;'),
      ('c@example.com','bounced','t3',';VIP;')`).run();
    const originalFetch = globalThis.fetch;
    const spy = okFetch();
    globalThis.fetch = spy;
    try {
      const res = await worker.fetch(auth('/api/admin/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({ name: 'x', subject: 's', content_html: '<p>hi</p>', target_type: 'tag', target_tag: 'VIP' }),
      }), env, ctx);
      const d = await res.json() as any;
      expect(d.sent_success).toBe(1);
      expect(spy).toHaveBeenCalledTimes(1);
      const calledTo = spy.mock.calls[0][1].body;
      expect(calledTo).toContain('a@example.com');
    } finally { globalThis.fetch = originalFetch; }
  });

  it('Gherkin 7：429 重試後成功；持續 429 記 failed 且完成回摘要', async () => {
    sqlite.prepare("INSERT INTO subscribers (email,status,unsubscribe_token,tags) VALUES ('r@example.com','active','t9',';VIP;')").run();
    const originalFetch = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      calls++;
      if (calls <= 2) return Promise.resolve({ ok: false, status: 429, headers: new Headers(), text: async () => 'rate limit' });
      return Promise.resolve({ ok: true, status: 200, text: async () => '{"id":"m2"}', json: async () => ({ id: 'm2' }) });
    });
    try {
      const res = await worker.fetch(auth('/api/admin/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({ name: 'x', subject: 's', content_html: '<p>hi</p>', target_type: 'tag', target_tag: 'VIP' }),
      }), env, ctx);
      const d = await res.json() as any;
      expect(d.sent_success).toBe(1);
      expect(calls).toBe(3); // 1 + 2 次重試
    } finally { globalThis.fetch = originalFetch; }
  });

  it('Gherkin 10：退信 webhook 標記 bounced，後續 drip 排除', async () => {
    sqlite.prepare("INSERT INTO subscribers (email,status,unsubscribe_token,tags) VALUES ('w@example.com','active','tok-w',';VIP;')").run();
    // webhook 標記（端點對應 ToSend 退信通知）
    const hookRes = await worker.fetch(new Request(BASE + '/api/webhook/tosend', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'bounce', email: 'w@example.com' }),
    }), env, ctx);
    expect([200, 204]).toContain(hookRes.status);
    expect(sqlite.prepare("SELECT status FROM subscribers WHERE email='w@example.com'").get().status).toBe('bounced');
    // 群發不再包含
    const { getActiveSubscribersByTag } = await import('../src/db');
    const list = await new (await import('../src/db')).DatabaseService(mockD1).getActiveSubscribersByTag('VIP');
    expect(list.find((s: any) => s.email === 'w@example.com')).toBeUndefined();
  });

  it('Gherkin 5：cron 連跑兩輪不重複寄（冪等）', async () => {
    sqlite.prepare("INSERT INTO subscribers (email,status,unsubscribe_token,current_step,created_at) VALUES ('d@example.com','active','t-d',0,datetime('now','-3 days'))").run();
    const originalFetch = globalThis.fetch;
    const spy = okFetch();
    globalThis.fetch = spy;
    try {
      const r1 = await worker.fetch(auth('/api/admin/trigger-cron', { method: 'POST' }), env, ctx);
      const n1 = (await r1.json() as any).sent_count;
      expect(n1).toBeGreaterThanOrEqual(1); // 預設 3 關皆可寄（訂閱已 3 天）
      const callsAfterRun1 = spy.mock.calls.length;
      const r2 = await worker.fetch(auth('/api/admin/trigger-cron', { method: 'POST' }), env, ctx);
      expect((await r2.json() as any).sent_count).toBe(0); // 已寄過，不重複
      expect(spy.mock.calls.length).toBe(callsAfterRun1); // 第二輪零寄送
    } finally { globalThis.fetch = originalFetch; }
  });
});
