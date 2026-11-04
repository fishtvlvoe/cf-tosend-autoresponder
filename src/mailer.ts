/**
 * 好寄寄信組態模組（mailer.ts）
 *
 * 職責：從 settings 表讀出寄信所需組態（ToSend Key 解密、寄件人、網域），
 * 取代舊版直接讀 env 的方式（規格書 §6 tosend.ts 顯式參數化）。
 *
 * 解密失敗（HAOJI_SECRET 被重設）會拋出 MailingConfigError，
 * 呼叫端應記錄錯誤並停止本輪寄送（cron）或回 400（API）。
 */
import { Env } from './types';
import { DatabaseService } from './db';
import { decryptSecret } from './crypto';

export class MailingConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MailingConfigError';
  }
}

export interface MailerConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  siteDomain: string;
}

export async function loadMailerConfig(dbService: DatabaseService, env: Env): Promise<MailerConfig> {
  const keyRow = await dbService.getSetting('tosend_api_key');
  if (!keyRow || !keyRow.value) {
    throw new MailingConfigError('ToSend API Key 尚未設定');
  }
  let apiKey: string;
  try {
    apiKey = await decryptSecret(keyRow.value, env.HAOJI_SECRET);
  } catch {
    throw new MailingConfigError('ToSend Key 因金鑰（HAOJI_SECRET）變更而失效，請至設定頁重新驗證');
  }
  const fromEmail = (await dbService.getSetting('tosend_from_email'))?.value || '';
  const fromName = (await dbService.getSetting('tosend_from_name'))?.value || '好寄';
  const siteDomain = (await dbService.getSetting('site_domain'))?.value || '';
  if (!fromEmail || !siteDomain) {
    throw new MailingConfigError('寄件人信箱或網域尚未設定');
  }
  return { apiKey, fromEmail, fromName, siteDomain };
}
