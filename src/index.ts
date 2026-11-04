import { Env } from './types';
import { DatabaseService } from './db';
import { renderLandingPage, renderUnsubscribePage, renderAdminConsole, renderLoginPage } from './page';
import { sendWelcomeEmailIfConfigured, runDripScheduler } from './drip';
import { sendEmailViaToSend } from './tosend';
import { hashPassword, verifyPassword, newSessionToken } from './crypto';

const SESSION_MAX_AGE_SEC = 7 * 24 * 3600; // 滑動 7 天
const SETUP_LOCK_MS = 10 * 60 * 1000; // setup-password 鎖定 10 分鐘

function readSessionCookie(request: Request): string {
  return (request.headers.get('Cookie') || '').match(/haoji_session=([^;]+)/)?.[1] || '';
}

/**
 * 驗證 session（單一裝置、滑動 7 天過期）。
 * 通過時每分鐘最多更新一次 updated_at（滑動續期），避免每個請求都寫庫。
 */
async function validateSession(dbService: DatabaseService, request: Request): Promise<boolean> {
  const token = readSessionCookie(request);
  if (!token) return false;
  const tokRow = await dbService.getSetting('admin_session_token');
  if (!tokRow || tokRow.value !== token) return false;
  const timeRow = await dbService.getSetting('admin_session_updated_at');
  const last = timeRow ? Date.parse(timeRow.value) : 0;
  if (!last || Date.now() - last > SESSION_MAX_AGE_SEC * 1000) return false;
  if (Date.now() - last > 60 * 1000) {
    await dbService.setSetting('admin_session_updated_at', new Date().toISOString());
  }
  return true;
}

async function issueSession(dbService: DatabaseService): Promise<string> {
  const token = newSessionToken();
  await dbService.setSetting('admin_session_token', token);
  await dbService.setSetting('admin_session_updated_at', new Date().toISOString());
  return token;
}

function sessionCookie(token: string): string {
  return `haoji_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SEC}`;
}

export default {
  /**
   * 處理 HTTP 請求
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const dbService = new DatabaseService(env.DB);

    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }

    // 0. 後台管理員登入頁面
    if (url.pathname === '/login' && request.method === 'GET') {
      return renderLoginPage();
    }

    // 0.1 後台登入 API（密碼 → scrypt 驗證 → 設 session Cookie）
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { password?: string };
      const hashRow = await dbService.getSetting('admin_password_hash');
      if (!hashRow) {
        return Response.json({ error: '密碼尚未建立', code: 'PASSWORD_NOT_SET' }, { status: 403 });
      }
      // 空密碼絕不通過（修復舊版空 token 後門）
      const ok = body.password ? await verifyPassword(body.password, hashRow.value) : false;
      if (!ok) {
        return Response.json({ error: '密碼錯誤' }, { status: 401 });
      }
      const token = await issueSession(dbService);
      return Response.json({ success: true }, { headers: { 'Set-Cookie': sessionCookie(token) } });
    }

    // 0.2 首次建立管理密碼（僅限密碼未建立時；失敗 5 次鎖 10 分鐘）
    if (url.pathname === '/api/admin/setup-password' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { password?: string };
      const lockRow = await dbService.getSetting('setup_lock_until');
      if (lockRow && Number(lockRow.value) > Date.now()) {
        return Response.json({ error: '嘗試次數過多，請 10 分鐘後再試' }, { status: 429 });
      }
      if (await dbService.getSetting('admin_password_hash')) {
        return Response.json({ error: '密碼已存在，請用修改密碼功能' }, { status: 403 });
      }
      if (!body.password || body.password.length < 8) {
        return Response.json({ error: '密碼至少 8 個字元' }, { status: 400 });
      }
      // 失敗計數（此處的「失敗」指系統性錯誤前的驗證嘗試；成功即清除）
      const failRow = await dbService.getSetting('setup_fail_count');
      if (failRow && Number(failRow.value) >= 5) {
        await dbService.setSetting('setup_lock_until', String(Date.now() + SETUP_LOCK_MS));
        await dbService.deleteSetting('setup_fail_count');
        return Response.json({ error: '嘗試次數過多，已鎖定 10 分鐘' }, { status: 429 });
      }
      await dbService.setSetting('admin_password_hash', await hashPassword(body.password));
      await dbService.deleteSetting('setup_fail_count');
      const token = await issueSession(dbService);
      return Response.json({ success: true }, { headers: { 'Set-Cookie': sessionCookie(token) } });
    }

    // 0.3 修改密碼（需已登入；成功後舊 session 全部失效）
    if (url.pathname === '/api/admin/change-password' && request.method === 'POST') {
      if (!(await validateSession(dbService, request))) {
        return Response.json({ error: '未登入' }, { status: 401 });
      }
      const body = (await request.json().catch(() => ({}))) as { old_password?: string; new_password?: string };
      const hashRow = await dbService.getSetting('admin_password_hash');
      const oldOk = body.old_password && hashRow ? await verifyPassword(body.old_password, hashRow.value) : false;
      if (!oldOk) {
        return Response.json({ error: '原密碼錯誤' }, { status: 401 });
      }
      if (!body.new_password || body.new_password.length < 8) {
        return Response.json({ error: '新密碼至少 8 個字元' }, { status: 400 });
      }
      await dbService.setSetting('admin_password_hash', await hashPassword(body.new_password));
      const token = await issueSession(dbService); // 重發 session，舊 Cookie 失效
      return Response.json({ success: true }, { headers: { 'Set-Cookie': sessionCookie(token) } });
    }

    // 0. 後台控制台 UI（未登入導向登入頁）
    if (url.pathname === '/admin' && request.method === 'GET') {
      if (!(await validateSession(dbService, request))) {
        return Response.redirect(`${url.origin}/login`, 302);
      }
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
    // 供 AI / 管理端調用的 REST API (需要驗證)
    // ──────────────────────────────────────────────
    if (url.pathname.startsWith('/api/admin/')) {
      // 驗證：session Cookie（單一裝置、滑動 7 天）；不再支援明文 token / 未設金鑰放行
      if (!(await validateSession(dbService, request))) {
        return Response.json({ error: '未登入或工作階段已過期' }, { status: 401 });
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

      // 5. 手動觸發一次排程檢查
      if (url.pathname === '/api/admin/trigger-cron' && request.method === 'POST') {
        const sentCount = await runDripScheduler(env, dbService);
        return Response.json({ success: true, sent_count: sentCount });
      }

      // 6. 後台個別寄信 (Direct Send)
      if (url.pathname === '/api/admin/send-direct' && request.method === 'POST') {
        const body = (await request.json()) as {
          email: string;
          name?: string;
          subject: string;
          content: string;
        };

        if (!body.email || !body.subject || !body.content) {
          return Response.json({ error: '請提供收件者 Email、主旨與內容' }, { status: 400 });
        }

        const subRes = await dbService.upsertSubscriber(body.email, body.name);
        const sendResult = await sendEmailViaToSend(env, {
          toEmail: body.email,
          toName: body.name,
          subject: body.subject,
          html: body.content,
          unsubscribeUrl: `${env.APP_URL || ''}/unsubscribe?token=${subRes.subscriber.unsubscribe_token}`,
        });

        await dbService.recordDirectSendLog({
          subscriberId: subRes.subscriber.id,
          status: sendResult.ok ? 'sent' : 'failed',
          messageId: sendResult.messageId,
          errorMsg: sendResult.error,
        });

        return Response.json({
          success: sendResult.ok,
          messageId: sendResult.messageId,
          error: sendResult.error,
        });
      }

      // 7. 電子報廣播群發 (Campaign Broadcast)
      if (url.pathname === '/api/admin/campaigns/send' && request.method === 'POST') {
        const body = (await request.json()) as {
          name: string;
          subject: string;
          content_html: string;
          target_type: 'all' | 'tag' | 'manual';
          target_tag?: string;
          manual_emails?: string[];
        };

        if (!body.subject || !body.content_html) {
          return Response.json({ error: '請提供信件主旨與正文內容' }, { status: 400 });
        }

        let recipients: any[] = [];
        if (body.target_type === 'tag') {
          recipients = await dbService.getActiveSubscribersByTag(body.target_tag);
        } else {
          recipients = await dbService.getActiveSubscribersByTag('all');
        }

        let sentSuccess = 0;
        let sentFailed = 0;

        for (const sub of recipients) {
          const personalHtml = body.content_html
            .replace(/\{\{name\}\}/g, sub.name || '')
            .replace(/\{\{email\}\}/g, sub.email)
            .replace(/\{\{unsubscribeUrl\}\}/g, `${env.APP_URL || ''}/unsubscribe?token=${sub.unsubscribe_token}`);

          const result = await sendEmailViaToSend(env, {
            toEmail: sub.email,
            toName: sub.name,
            subject: body.subject,
            html: personalHtml,
            unsubscribeUrl: `${env.APP_URL || ''}/unsubscribe?token=${sub.unsubscribe_token}`,
          });

          await dbService.recordDirectSendLog({
            subscriberId: sub.id,
            status: result.ok ? 'sent' : 'failed',
            messageId: result.messageId,
            errorMsg: result.error,
          });

          if (result.ok) sentSuccess++;
          else sentFailed++;
        }

        await dbService.saveCampaign({
          name: body.name || body.subject,
          subject: body.subject,
          content_html: body.content_html,
          target_type: body.target_type || 'all',
          target_tag: body.target_tag || '',
          sent_count: sentSuccess,
        });

        return Response.json({
          success: true,
          total_targets: recipients.length,
          sent_success: sentSuccess,
          sent_failed: sentFailed,
        });
      }

      // 8. 後台新增聯絡人
      if (url.pathname === '/api/admin/subscribers' && request.method === 'POST') {
        const body = (await request.json()) as {
          email: string;
          name?: string;
          tags?: string;
        };

        if (!body.email || !body.email.includes('@')) {
          return Response.json({ error: '請提供合法的 Email 地址' }, { status: 400 });
        }

        const { subscriber, isNew } = await dbService.upsertSubscriber(body.email, body.name, body.tags);
        return Response.json({ success: true, subscriber, isNew });
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
