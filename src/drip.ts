import { Env, Subscriber, EmailSequence } from './types';
import { DatabaseService } from './db';
import { sendEmailViaToSend } from './tosend';
import { loadMailerConfig, MailingConfigError } from './mailer';

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
 * 產生退訂專用連結（使用學員設定的網域）
 */
export function getUnsubscribeUrl(siteDomain: string, token: string): string {
  const base = siteDomain.replace(/\/+$/, '');
  const withScheme = /^https?:\/\//.test(base) ? base : `https://${base}`;
  return `${withScheme}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/**
 * 處理「新訂閱後立即發送歡迎信」（若 step 1 設為 delay_hours = 0）
 * 設定不完整或金鑰解密失敗時回 false 並記錄錯誤（規格書 §7.3 cron 行為）
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

  let config;
  try {
    config = await loadMailerConfig(dbService, env);
  } catch (err) {
    console.error('[WelcomeEmail] 寄信組態錯誤：', err instanceof MailingConfigError ? err.message : err);
    return false;
  }

  const unsubUrl = getUnsubscribeUrl(config.siteDomain, subscriber.unsubscribe_token);
  const personalizedHtml = interpolateVariables(welcomeStep.content_html, subscriber);
  const personalizedSubject = interpolateVariables(welcomeStep.subject, subscriber);

  const sendResult = await sendEmailViaToSend({
    ...config,
    baseUrl: env.TOSEND_API_BASE_URL,
    payload: {
      toEmail: subscriber.email,
      toName: subscriber.name,
      subject: personalizedSubject,
      html: personalizedHtml,
      unsubscribeUrl: unsubUrl,
    },
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
 * 冪等保證（規格書 §7.5）：
 *  - 寄前檢查 delivery_logs 是否已有該 sequence 的紀錄（重疊 cron / 重跑防重複）
 *  - 寄後以「條件式 UPDATE current_step」原子推進，影響 0 列即代表他處已處理
 *  - at-least-once 語意：ToSend 已寄出但回應遺失的極少數案件會重複，此為可接受上限
 */
export async function runDripScheduler(env: Env, dbService: DatabaseService): Promise<number> {
  let config;
  try {
    config = await loadMailerConfig(dbService, env);
  } catch (err) {
    console.error('[cron] 寄信組態錯誤，跳過本輪：', err instanceof MailingConfigError ? err.message : err);
    return 0;
  }

  const sequences = await dbService.getAllActiveSequences();
  let totalSent = 0;

  for (const seq of sequences) {
    const pendingSubs = await dbService.getPendingSubscribersForStep(seq.step_number, seq.delay_hours, 50);

    for (const sub of pendingSubs) {
      // 冪等檢查：已有該 sequence 紀錄（含他個體正在處理）即跳過
      const alreadyHandled = await dbService.hasDeliveryLogFor(sub.id, seq.id);
      if (alreadyHandled) continue;

      const unsubUrl = getUnsubscribeUrl(config.siteDomain, sub.unsubscribe_token);
      const subject = interpolateVariables(seq.subject, sub);
      const html = interpolateVariables(seq.content_html, sub);

      const res = await sendEmailViaToSend({
        ...config,
        baseUrl: env.TOSEND_API_BASE_URL,
        payload: { toEmail: sub.email, toName: sub.name, subject, html, unsubscribeUrl: unsubUrl },
      });

      if (res.ok) {
        const advanced = await dbService.recordSentAndAdvanceStep(sub.id, seq.id, seq.step_number, res.messageId);
        if (advanced) totalSent++;
      } else {
        await dbService.recordFailureLog(sub.id, seq.id, res.error || 'Send failed');
      }
    }
  }

  return totalSent;
}
