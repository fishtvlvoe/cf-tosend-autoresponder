import { Env, Subscriber, EmailSequence } from './types';
import { DatabaseService } from './db';
import { sendEmailViaToSend } from './tosend';

/**
 * 替換信件內變數
 */
export function interpolateVariables(template: string, subscriber: Subscriber): string {
  const fallbackName = subscriber.name || '朋友';
  return template
    .replace(/\{\{\s*name\s*\}\}/g, fallbackName)
    .replace(/\{\{\s*email\s*\}\}/g, subscriber.email);
}

/**
 * 產生退訂專用連結
 */
export function getUnsubscribeUrl(appUrl: string, token: string): string {
  const base = appUrl.replace(/\/+$/, '');
  return `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * 處理「新訂閱後立即發送歡迎信」（若 step 1 設為 delay_hours = 0）
 */
export async function sendWelcomeEmailIfConfigured(
  env: Env,
  dbService: DatabaseService,
  subscriber: Subscriber
): Promise<boolean> {
  const welcomeStep = await dbService.getSequenceByStep(1);
  if (!welcomeStep || welcomeStep.delay_hours !== 0 || !welcomeStep.is_active) {
    return false;
  }

  // 若目前 step 已經大於等於 1 則不重複寄
  if (subscriber.current_step >= 1) {
    return false;
  }

  const appUrl = env.APP_URL || 'https://cf-tosend-autoresponder.workers.dev';
  const unsubUrl = getUnsubscribeUrl(appUrl, subscriber.unsubscribe_token);
  const personalizedHtml = interpolateVariables(welcomeStep.content_html, subscriber);
  const personalizedSubject = interpolateVariables(welcomeStep.subject, subscriber);

  const sendResult = await sendEmailViaToSend(env, {
    toEmail: subscriber.email,
    toName: subscriber.name,
    subject: personalizedSubject,
    html: personalizedHtml,
    unsubscribeUrl: unsubUrl,
  });

  if (sendResult.ok) {
    await dbService.recordSentAndAdvanceStep(subscriber.id, welcomeStep.id, 1, sendResult.messageId);
    console.info(`[WelcomeEmail] Successfully sent to ${subscriber.email}`);
    return true;
  } else {
    await dbService.recordFailureLog(subscriber.id, welcomeStep.id, sendResult.error || 'Unknown error');
    console.error(`[WelcomeEmail] Failed for ${subscriber.email}:`, sendResult.error);
    return false;
  }
}

/**
 * 自動執行 Cron 排程發送（掃描各 sequence 該寄的訂閱者）
 */
export async function runDripScheduler(env: Env, dbService: DatabaseService): Promise<number> {
  const sequences = await dbService.getAllActiveSequences();
  let totalSent = 0;
  const appUrl = env.APP_URL || 'https://cf-tosend-autoresponder.workers.dev';

  for (const seq of sequences) {
    // 取得該 step 等待寄送的訂閱者
    const pendingSubs = await dbService.getPendingSubscribersForStep(seq.step_number, seq.delay_hours, 50);

    for (const sub of pendingSubs) {
      const unsubUrl = getUnsubscribeUrl(appUrl, sub.unsubscribe_token);
      const subject = interpolateVariables(seq.subject, sub);
      const html = interpolateVariables(seq.content_html, sub);

      const res = await sendEmailViaToSend(env, {
        toEmail: sub.email,
        toName: sub.name,
        subject,
        html,
        unsubscribeUrl: unsubUrl,
      });

      if (res.ok) {
        await dbService.recordSentAndAdvanceStep(sub.id, seq.id, seq.step_number, res.messageId);
        totalSent++;
      } else {
        await dbService.recordFailureLog(sub.id, seq.id, res.error || 'Send failed');
      }
    }
  }

  return totalSent;
}
