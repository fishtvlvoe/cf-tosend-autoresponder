import { Env, Subscriber, EmailSequence } from './types';

export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * 建立或重新啟用訂閱者
   */
  async upsertSubscriber(email: string, name?: string): Promise<{ subscriber: Subscriber; isNew: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim();

    // 先查詢既有記錄
    const existing = await this.db
      .prepare('SELECT * FROM subscribers WHERE email = ?')
      .bind(cleanEmail)
      .first<Subscriber>();

    if (existing) {
      if (existing.status !== 'active') {
        await this.db
          .prepare("UPDATE subscribers SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(existing.id)
          .run();
        existing.status = 'active';
      }
      return { subscriber: existing, isNew: false };
    }

    const token = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO subscribers (email, name, unsubscribe_token, status, current_step)
        VALUES (?, ?, ?, 'active', 0)
      `)
      .bind(cleanEmail, cleanName, token)
      .run();

    const created = await this.db
      .prepare('SELECT * FROM subscribers WHERE email = ?')
      .bind(cleanEmail)
      .first<Subscriber>();

    return { subscriber: created!, isNew: true };
  }

  /**
   * 透過 token 退訂
   */
  async unsubscribeByToken(token: string): Promise<boolean> {
    const res = await this.db
      .prepare("UPDATE subscribers SET status = 'unsubscribed', updated_at = CURRENT_TIMESTAMP WHERE unsubscribe_token = ?")
      .bind(token)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  /**
   * 標記退信或投訴
   */
  async markBounceOrComplaint(email: string, status: 'bounced' | 'complained'): Promise<void> {
    await this.db
      .prepare("UPDATE subscribers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?")
      .bind(status, email.trim().toLowerCase())
      .run();
  }

  /**
   * 取得指定 step 序號的信件範本
   */
  async getSequenceByStep(stepNumber: number): Promise<EmailSequence | null> {
    return await this.db
      .prepare('SELECT * FROM email_sequences WHERE step_number = ? AND is_active = 1')
      .bind(stepNumber)
      .first<EmailSequence>();
  }

  /**
   * 取得所有啟用的序列
   */
  async getAllActiveSequences(): Promise<EmailSequence[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM email_sequences WHERE is_active = 1 ORDER BY step_number ASC')
      .all<EmailSequence>();
    return results;
  }

  /**
   * 取得符合發送條件的訂閱者名單
   * 條件：status = 'active' 且 current_step = (step_number - 1) 且 created_at + delay_hours <= 現在時間
   */
  async getPendingSubscribersForStep(stepNumber: number, delayHours: number, limit = 50): Promise<Subscriber[]> {
    const sql = `
      SELECT * FROM subscribers
      WHERE status = 'active'
        AND current_step = (? - 1)
        AND datetime(created_at, '+' || ? || ' hours') <= datetime('now')
      ORDER BY id ASC
      LIMIT ?
    `;
    const { results } = await this.db.prepare(sql).bind(stepNumber, delayHours, limit).all<Subscriber>();
    return results;
  }

  /**
   * 記錄發信狀態並更新訂閱者的 current_step
   */
  async recordSentAndAdvanceStep(
    subscriberId: number,
    sequenceId: number,
    nextStepNumber: number,
    messageId?: string
  ): Promise<void> {
    await this.db.batch([
      this.db
        .prepare(`
          INSERT INTO delivery_logs (subscriber_id, sequence_id, tosend_message_id, status)
          VALUES (?, ?, ?, 'sent')
        `)
        .bind(subscriberId, sequenceId, messageId || null),
      this.db
        .prepare("UPDATE subscribers SET current_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .bind(nextStepNumber, subscriberId),
    ]);
  }

  /**
   * 記錄寄送失敗日誌
   */
  async recordFailureLog(subscriberId: number, sequenceId: number, errorMsg: string): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO delivery_logs (subscriber_id, sequence_id, status, error_message)
        VALUES (?, ?, 'failed', ?)
      `)
      .bind(subscriberId, sequenceId, errorMsg)
      .run();
  }

  /**
   * 管理 API：列出名單
   */
  async listSubscribers(limit = 100): Promise<Subscriber[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM subscribers ORDER BY id DESC LIMIT ?')
      .bind(limit)
      .all<Subscriber>();
    return results;
  }

  /**
   * 中台：取得儀表板統計指標
   */
  async getDashboardStats(): Promise<{
    activeCount: number;
    unsubCount: number;
    sentCount: number;
    failedCount: number;
  }> {
    const activeRes = await this.db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE status = 'active'").first<{ n: number }>();
    const unsubRes = await this.db.prepare("SELECT COUNT(*) as n FROM subscribers WHERE status = 'unsubscribed'").first<{ n: number }>();
    const sentRes = await this.db.prepare("SELECT COUNT(*) as n FROM delivery_logs WHERE status = 'sent'").first<{ n: number }>();
    const failedRes = await this.db.prepare("SELECT COUNT(*) as n FROM delivery_logs WHERE status = 'failed'").first<{ n: number }>();

    return {
      activeCount: activeRes?.n ?? 0,
      unsubCount: unsubRes?.n ?? 0,
      sentCount: sentRes?.n ?? 0,
      failedCount: failedRes?.n ?? 0,
    };
  }

  /**
   * 中台：取得最近發信日誌
   */
  async getRecentDeliveryLogs(limit = 20): Promise<any[]> {
    const sql = `
      SELECT l.id, l.subscriber_id, l.sequence_id, l.status, l.error_message, l.sent_at,
             s.email as subscriber_email, s.name as subscriber_name,
             q.step_number, q.subject as sequence_subject
      FROM delivery_logs l
      LEFT JOIN subscribers s ON s.id = l.subscriber_id
      LEFT JOIN email_sequences q ON q.id = l.sequence_id
      ORDER BY l.id DESC
      LIMIT ?
    `;
    const { results } = await this.db.prepare(sql).bind(limit).all();
    return results;
  }

  /**
   * 管理 API：新增或更新信件序列
   */
  async upsertSequence(seq: {
    step_number: number;
    delay_hours: number;
    subject: string;
    content_html: string;
    is_active?: number;
  }): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO email_sequences (step_number, delay_hours, subject, content_html, is_active)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(step_number) DO UPDATE SET
          delay_hours = excluded.delay_hours,
          subject = excluded.subject,
          content_html = excluded.content_html,
          is_active = excluded.is_active
      `)
      .bind(
        seq.step_number,
        seq.delay_hours,
        seq.subject,
        seq.content_html,
        seq.is_active !== undefined ? seq.is_active : 1
      )
      .run();
  }
}
