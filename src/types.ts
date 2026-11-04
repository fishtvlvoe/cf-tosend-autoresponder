export interface Env {
  DB: D1Database;
  HAOJI_SECRET: string;
  TOSEND_API_KEY: string;
  TOSEND_API_BASE_URL?: string;
  TOSEND_FROM_EMAIL: string;
  TOSEND_FROM_NAME: string;
  /** @deprecated Phase 5 將由 settings.site_domain 取代 */
  APP_URL?: string;
}

export interface Subscriber {
  id: number;
  email: string;
  name: string;
  tags?: string;
  status: 'active' | 'unsubscribed' | 'bounced' | 'complained';
  unsubscribe_token: string;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  content_html: string;
  target_type: 'all' | 'tag' | 'manual';
  target_tag?: string;
  sent_count: number;
  created_at?: string;
}

export interface EmailSequence {
  id: number;
  step_number: number;
  delay_hours: number;
  subject: string;
  content_html: string;
  is_active: number;
  created_at?: string;
}

export interface SendEmailPayload {
  toEmail: string;
  toName?: string;
  subject: string;
  html: string;
  unsubscribeUrl?: string;
}

/**
 * 標籤正規化：一律存成分號包裹格式 `;a;b;`
 * 讓 LIKE '%;tag;%' 邊界比對能命中首尾標籤（規格書 §7.2）
 */
export function normalizeTags(tags: string | null | undefined): string {
  if (!tags) return '';
  const parts = tags
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  return unique.length ? `;${unique.join(';')};` : '';
}
