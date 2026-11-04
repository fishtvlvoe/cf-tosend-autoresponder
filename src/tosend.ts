import { SendEmailPayload } from './types';

const DEFAULT_TOSEND_BASE_URL = 'https://api.tosend.com/v2';

export interface ToSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  retryAfter?: string;
}

/**
 * 透過 ToSend REST API 寄送電子郵件
 * （顯式參數版：不再讀 env；呼叫端以 loadMailerConfig 注入，規格書 §6）
 */
export async function sendEmailViaToSend(params: {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  baseUrl?: string;
  payload: SendEmailPayload;
}): Promise<ToSendResult> {
  const { payload } = params;
  if (!params.apiKey) {
    return { ok: false, error: 'ToSend API Key 未提供' };
  }

  const baseUrl = (params.baseUrl || DEFAULT_TOSEND_BASE_URL).replace(/\/+$/, '');
  const fromEmail = params.fromEmail;
  const fromName = params.fromName;

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

  if (payload.unsubscribeUrl) {
    requestBody.headers = {
      'List-Unsubscribe': `<${payload.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.apiKey}`,
    'Content-Type': 'application/json',
  };

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
        retryAfter: response.headers.get('Retry-After') || undefined,
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
