import { Env } from './types';
import { DatabaseService } from './db';
import { renderLandingPage, renderUnsubscribePage, renderAdminConsole, renderLoginPage } from './page';
import { sendWelcomeEmailIfConfigured, runDripScheduler } from './drip';

export default {
  /**
   * 處理 HTTP 請求
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const dbService = new DatabaseService(env.DB);

    // 0. 後台管理員登入頁面
    if (url.pathname === '/login' && request.method === 'GET') {
      return renderLoginPage();
    }

    // 0. 中台與後台控制台 UI
    if (url.pathname === '/admin' && request.method === 'GET') {
      return renderAdminConsole();
    }

    // 1. 訂閱頁面 (前台著陸頁)
    if (url.pathname === '/' && request.method === 'GET') {
      return renderLandingPage();
    }

    // 2. 訂閱 API (支援 Honeypot 機器人防禦)
    if (url.pathname === '/api/subscribe' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { email?: string; name?: string; hp_company?: string };

        // 蜜罐欄位防禦：若機器人填入隱藏欄位，直接靜默回傳成功，不寫入 D1
        if (body.hp_company && body.hp_company.trim() !== '') {
          return Response.json({
            success: true,
            message: '感謝訂閱！第一封信即將發送到您的信箱。',
          });
        }

        if (!body.email || !body.email.includes('@')) {
          return Response.json({ error: '請提供有效的 Email 地址' }, { status: 400 });
        }

        const { subscriber, isNew } = await dbService.upsertSubscriber(body.email, body.name);

        // 如果是全新訂閱者，檢查是否需立即發送歡迎信 (Step 1, delay = 0)
        if (isNew) {
          ctx.waitUntil(sendWelcomeEmailIfConfigured(env, dbService, subscriber));
        }

        return Response.json({
          success: true,
          message: '感謝訂閱！第一封信即將發送到您的信箱。',
        });
      } catch (err: any) {
        console.error('[API Subscribe] Error:', err);
        return Response.json({ error: err.message || '訂閱失敗' }, { status: 500 });
      }
    }

    // 3. 取消訂閱頁面 (GET 帶確認頁面防爬蟲誤點)
    if (url.pathname === '/unsubscribe' && request.method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return renderUnsubscribePage({ success: false, isConfirmed: true });
      }
      return renderUnsubscribePage({ success: true, isConfirmed: false, token });
    }

    // 3.1 取消訂閱執行端點 (POST 按鈕確認或 RFC 8058 One-Click)
    if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
      try {
        let token = url.searchParams.get('token');
        if (!token) {
          const body = (await request.json().catch(() => ({}))) as { token?: string };
          token = body.token || null;
        }

        if (!token) {
          return Response.json({ error: 'Missing token' }, { status: 400 });
        }

        const success = await dbService.unsubscribeByToken(token);
        return Response.json({ success });
      } catch (err: any) {
        return Response.json({ error: err.message }, { status: 500 });
      }
    }

    // 4. ToSend 退信與投訴 Webhook 回調
    if (url.pathname === '/api/webhook/tosend' && request.method === 'POST') {
      try {
        const payload = (await request.json()) as any;
        const eventType = payload.event || payload.type;
        const email = payload.email || payload.recipient || payload.data?.email;

        if (email && (eventType === 'bounce' || eventType === 'bounced')) {
          await dbService.markBounceOrComplaint(email, 'bounced');
          console.info(`[Webhook] Mark bounced: ${email}`);
        } else if (email && (eventType === 'complaint' || eventType === 'complained')) {
          await dbService.markBounceOrComplaint(email, 'complained');
          console.info(`[Webhook] Mark complained: ${email}`);
        }

        return Response.json({ received: true });
      } catch (err: any) {
        console.error('[Webhook] Failed:', err);
        return Response.json({ error: err.message }, { status: 400 });
      }
    }

    // ──────────────────────────────────────────────
    // 供 AI / 管理端調用的 REST API (需要 Bearer Token)
    // ──────────────────────────────────────────────
    if (url.pathname.startsWith('/api/admin/')) {
      const authHeader = request.headers.get('Authorization');
      const expectedToken = env.ADMIN_API_KEY;
      const referer = request.headers.get('Referer') || '';
      const isFromAdminConsole = referer.includes('/admin');

      // 當設定了 ADMIN_API_KEY 且並非來自控制台同源請求時，強制驗證 Bearer Token
      if (expectedToken && !isFromAdminConsole && authHeader !== `Bearer ${expectedToken}`) {
        return Response.json({ error: 'Unauthorized: Invalid ADMIN_API_KEY' }, { status: 401 });
      }

      // AI: 列出名單
      if (url.pathname === '/api/admin/subscribers' && request.method === 'GET') {
        const list = await dbService.listSubscribers(100);
        return Response.json({ subscribers: list });
      }

      // 中台：取得儀表板數據指標
      if (url.pathname === '/api/admin/stats' && request.method === 'GET') {
        const stats = await dbService.getDashboardStats();
        return Response.json(stats);
      }

      // 中台：取得最近發信日誌
      if (url.pathname === '/api/admin/logs' && request.method === 'GET') {
        const logs = await dbService.getRecentDeliveryLogs(20);
        return Response.json({ logs });
      }

      // AI: 取得所有信件序列
      if (url.pathname === '/api/admin/sequences' && request.method === 'GET') {
        const sequences = await dbService.getAllActiveSequences();
        return Response.json({ sequences });
      }

      // AI: 新增或修改序列範本
      if (url.pathname === '/api/admin/sequences' && request.method === 'POST') {
        const body = (await request.json()) as {
          step_number: number;
          delay_hours: number;
          subject: string;
          content_html: string;
          is_active?: number;
        };

        if (!body.step_number || !body.subject || !body.content_html) {
          return Response.json({ error: 'Missing required sequence fields' }, { status: 400 });
        }

        await dbService.upsertSequence(body);
        return Response.json({ success: true, message: `Sequence step ${body.step_number} saved` });
      }

      // AI: 手動觸發一次排程檢查
      if (url.pathname === '/api/admin/trigger-cron' && request.method === 'POST') {
        const sentCount = await runDripScheduler(env, dbService);
        return Response.json({ success: true, sent_count: sentCount });
      }
    }

    return new Response('Not Found', { status: 404 });
  },

  /**
   * Cloudflare Cron Trigger (預設每小時觸發一次)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.info(`[Cron Trigger] Starting drip scheduler at ${new Date().toISOString()}`);
    const dbService = new DatabaseService(env.DB);
    ctx.waitUntil(
      runDripScheduler(env, dbService).then((count) => {
        console.info(`[Cron Trigger] Finished drip scheduler. Sent: ${count} emails.`);
      })
    );
  },
};
