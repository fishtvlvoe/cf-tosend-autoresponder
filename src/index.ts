import { Env } from './types';
import { DatabaseService } from './db';
import { renderLandingPage, renderUnsubscribePage, renderAdminConsole, renderLoginPage } from './page';
import { sendWelcomeEmailIfConfigured, runDripScheduler } from './drip';
import { sendEmailViaToSend } from './tosend';
import { hashPassword, verifyPassword, newSessionToken, encryptSecret, decryptSecret } from './crypto';
import { decodeCsvText, parseCsv, buildCsv } from './csv';

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

// ── settings 常數與輔助（規格書 §4/§5/§7.1）────────────────

/** 可經 settings API 寫入的鍵（唯讀保留鍵以外的白名單） */
const WRITABLE_SETTINGS = [
  'tosend_api_key',
  'tosend_from_email',
  'tosend_from_name',
  'site_domain',
  'landing_title',
  'landing_intro',
] as const;

const REQUIRED_SETTINGS = [
  'tosend_api_key',
  'tosend_from_email',
  'tosend_from_name',
  'site_domain',
  'landing_title',
] as const;

/** 寫入後重算 onboarding_done（derived：必填鍵全有值 = 1，否則 0） */
async function recomputeOnboarding(dbService: DatabaseService): Promise<void> {
  let done = 1;
  for (const key of REQUIRED_SETTINGS) {
    const row = await dbService.getSetting(key);
    if (!row || row.value === '') { done = 0; break; }
  }
  await dbService.setSetting('onboarding_done', String(done));
}

async function isOnboardingDone(dbService: DatabaseService): Promise<boolean> {
  const row = await dbService.getSetting('onboarding_done');
  return row?.value === '1';
}

/** 設定未完成時的統一阻擋回應（規格書 §7.3） */
function settingsIncompleteResponse(): Response {
  return Response.json({ error: '請先完成設定頁' }, { status: 400 });
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

      // ── settings：讀取（加密鍵永不回明文）────────────────
      if (url.pathname === '/api/admin/settings' && request.method === 'GET') {
        const out: Record<string, { value: string | null; set: boolean }> = {};
        for (const key of WRITABLE_SETTINGS) {
          const row = await dbService.getSetting(key);
          out[key] = row && row.value !== ''
            ? (row.is_encrypted ? { value: null, set: true } : { value: row.value, set: true })
            : { value: null, set: false };
        }
        const onboard = await dbService.getSetting('onboarding_done');
        return Response.json({ settings: out, onboarding_done: onboard?.value === '1' });
      }

      // ── settings：單鍵寫入（白名單外 400；金鑰加密落庫）──
      if (url.pathname === '/api/admin/settings' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as { key?: string; value?: string };
        const key = body.key ?? '';
        if (key.startsWith('admin_') || key === 'onboarding_done') {
          return Response.json({ error: '此設定鍵由系統管理，不可寫入' }, { status: 403 });
        }
        if (!(WRITABLE_SETTINGS as readonly string[]).includes(key)) {
          return Response.json({ error: '不支援寫入的設定鍵' }, { status: 400 });
        }
        const value = String(body.value ?? '');
        if (key === 'tosend_api_key') {
          if (!value) {
            // 清除金鑰（一鍵重設流程）
            await dbService.deleteSetting(key);
          } else {
            await dbService.setSetting(key, await encryptSecret(value, env.HAOJI_SECRET), 1);
          }
        } else {
          await dbService.setSetting(key, value);
        }
        await recomputeOnboarding(dbService);
        return Response.json({ success: true });
      }

      // ── settings：ToSend 驗證（不落庫，成功才由前端接續寫入）──
      if (url.pathname === '/api/admin/settings/verify-tosend' && request.method === 'POST') {
        const body = (await request.json().catch(() => ({}))) as {
          api_key?: string; from_email?: string; from_name?: string;
        };
        if (!body.api_key || !body.from_email) {
          return Response.json({ error: '請提供 api_key 與 from_email' }, { status: 400 });
        }
        const baseUrl = (env.TOSEND_API_BASE_URL || 'https://api.tosend.com/v2').replace(/\/+$/, '');
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 10000);
          const res = await fetch(`${baseUrl}/emails`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${body.api_key}`,
            },
            body: JSON.stringify({
              from: `${body.from_name || '好寄'} <${body.from_email}>`,
              to: [body.from_email],
              subject: '【好寄】設定驗證信',
              html: '<p>這是一封系統設定驗證信。收到代表你的 ToSend 金鑰與寄件人設定正確。</p>',
            }),
            signal: ctrl.signal,
          });
          clearTimeout(timer);
          if (!res.ok) {
            const raw = await res.text().catch(() => '');
            const reason = res.status === 401 || res.status === 403
              ? 'API Key 無效'
              : res.status === 422 || res.status === 400
                ? '寄件信箱尚未在 ToSend 驗證，或格式不正確'
                : `ToSend 回應錯誤（${res.status}）`;
            return Response.json({ error: reason, detail: raw.slice(0, 300) }, { status: 400 });
          }
          return Response.json({ success: true });
        } catch (err: any) {
          const msg = err?.name === 'AbortError' ? '連線 ToSend 逾時（10 秒）' : `無法連線至 ToSend：${String(err?.message || err)}`;
          return Response.json({ error: msg }, { status: 400 });
        }
      }

      // AI: 列出名單
      if (url.pathname === '/api/admin/subscribers' && request.method === 'GET') {
        const list = await dbService.listSubscribers(100);
        return Response.json({ subscribers: list });
      }

      // 標籤清單（explode + 計數，即時計算）
      if (url.pathname === '/api/admin/tags' && request.method === 'GET') {
        const tags = await dbService.listTags();
        return Response.json({ tags });
      }

      // 編輯聯絡人（部分更新；tags 覆蓋式正規化）
      if (url.pathname === '/api/admin/subscribers' && request.method === 'PUT') {
        const body = (await request.json().catch(() => ({}))) as {
          id?: number; name?: string; tags?: string; status?: string;
        };
        if (!body.id) {
          return Response.json({ error: '請提供聯絡人 id' }, { status: 400 });
        }
        const ok = await dbService.updateSubscriber(body.id, {
          name: body.name, tags: body.tags, status: body.status,
        });
        if (!ok) {
          return Response.json({ error: '找不到該聯絡人或無可更新欄位' }, { status: 404 });
        }
        return Response.json({ success: true });
      }

      // 刪除聯絡人（軟刪除，保留發信紀錄）
      if (url.pathname === '/api/admin/subscribers' && request.method === 'DELETE') {
        const id = Number(url.searchParams.get('id'));
        if (!id) {
          return Response.json({ error: '請提供聯絡人 id' }, { status: 400 });
        }
        await dbService.softDeleteSubscriber(id);
        return Response.json({ success: true });
      }

      // CSV 匯入（text/csv；≤1MB、≤5000 列，逐列錯誤回報含列號）
      if (url.pathname === '/api/admin/import' && request.method === 'POST') {
        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('csv')) {
          return Response.json({ error: '請以 text/csv 上傳' }, { status: 400 });
        }
        const buf = await request.arrayBuffer();
        if (buf.byteLength > 1024 * 1024) {
          return Response.json({ error: '檔案超過 1MB，請分批匯入' }, { status: 413 });
        }
        let text: string;
        try {
          text = decodeCsvText(buf);
        } catch {
          return Response.json({ error: '編碼錯誤：請用 Excel「另存新檔 → CSV UTF-8」' }, { status: 400 });
        }
        const parsed = parseCsv(text);
        if (parsed.rows.length > 5000) {
          return Response.json({ error: '單批上限 5,000 列，請分批匯入' }, { status: 400 });
        }
        let succeeded = 0;
        for (const row of parsed.rows) {
          await dbService.upsertSubscriber(row.email, row.name, row.tags);
          succeeded++;
        }
        return Response.json({
          success: true,
          total: parsed.total,
          succeeded,
          failed: parsed.errors.length,
          errors: parsed.errors,
        });
      }

      // CSV 匯出（BOM + UTF-8）
      if (url.pathname === '/api/admin/export' && request.method === 'GET') {
        const all = await dbService.listSubscribers(100000);
        const csv = buildCsv(all);
        return new Response(csv, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="subscribers.csv"',
          },
        });
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
        if (!(await isOnboardingDone(dbService))) {
          console.error('[cron] 設定未完成，跳過本輪');
          return Response.json({ error: '請先完成設定頁' }, { status: 400 });
        }
        const sentCount = await runDripScheduler(env, dbService);
        return Response.json({ success: true, sent_count: sentCount });
      }

      // 6. 後台個別寄信 (Direct Send)
      if (url.pathname === '/api/admin/send-direct' && request.method === 'POST') {
        if (!(await isOnboardingDone(dbService))) {
          return settingsIncompleteResponse();
        }
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
        if (!(await isOnboardingDone(dbService))) {
          return settingsIncompleteResponse();
        }
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
