import { Env, SendEmailPayload } from './types';

const DEFAULT_TOSEND_BASE_URL = 'https://api.tosend.com/v2';

export interface ToSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * 透過 ToSend REST API 寄送電子郵件
 * 參考自 workspace 中 ai-newsletter-notifier 與 bni-ai-saas 的穩定實作
 */
export async function sendEmailViaToSend(
  env: Env,
  payload: SendEmailPayload
): Promise<ToSendResult> {
  const apiKey = env.TOSEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'TOSEND_API_KEY is not configured in Worker secrets' };
  }

  const baseUrl = (env.TOSEND_API_BASE_URL || DEFAULT_TOSEND_BASE_URL).replace(/\/+$/, '');
  const fromEmail = env.TOSEND_FROM_EMAIL || 'noreply@tosend.com';
  const fromName = env.TOSEND_FROM_NAME || 'Autoresponder';

  // 加上 RFC List-Unsubscribe 相關標記與信末退訂區塊
  let finalHtml = payload.html;
  if (payload.unsubscribeUrl) {
    finalHtml += `
      <br/><br/>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="font-size:12px;color:#94a3b8;line-height:1.5;">
        如果你不想再收到這類郵件，請點擊此處
        <a href="${payload.unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">取消訂閱</a>。
      </p>
    `;
  }

  const requestBody: Record<string, unknown> = {
    from: {
      email: fromEmail,
      name: fromName,
    },
    to: [
      {
        email: payload.toEmail,
        name: payload.toName || payload.toEmail,
      },
    ],
    subject: payload.subject,
    html: finalHtml,
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (payload.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${payload.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/emails`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!response.ok) {
      const errMsg = `ToSend API error (${response.status}): ${responseText}`;
      console.error(errMsg);
      return {
        ok: false,
        statusCode: response.status,
        error: errMsg,
      };
    }

    const messageId = responseData.message_id || responseData.messageId || responseData.id;
    return {
      ok: true,
      statusCode: response.status,
      messageId,
    };
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    const errMsg = isTimeout ? 'ToSend request timeout (10s)' : err.message;
    console.error('[sendEmailViaToSend] Failed:', errMsg);
    return {
      ok: false,
      error: errMsg,
    };
  }
}
