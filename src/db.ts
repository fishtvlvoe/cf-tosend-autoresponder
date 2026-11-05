/**
 * 好寄資料層（db.ts）
 * 職責：所有 D1 SQL 的唯一入口。改欄位要同步 schema.sql 與 migrations/。
 */
import { Env, Subscriber, EmailSequence, normalizeTags } from './types';

export class DatabaseService {
  constructor(private db: D1Database) {}

  /**
   * 建立或重新啟用訂閱者（tags 一律正規化為 `;a;b;` 格式）
   */
  async upsertSubscriber(email: string, name?: string, tags?: string): Promise<{ subscriber: Subscriber; isNew: boolean }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanTag = normalizeTags(tags || '一般訂閱');

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
      if ((tags && cleanTag !== existing.tags) || (name && cleanName !== existing.name)) {
        await this.db
          .prepare("UPDATE subscribers SET tags = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
          .bind(cleanTag || existing.tags, cleanName || existing.name, existing.id)
          .run();
        if (tags) existing.tags = cleanTag;
        if (name) existing.name = cleanName;
      }
      return { subscriber: existing, isNew: false };
    }

    const token = crypto.randomUUID();
    await this.db
      .prepare(`
        INSERT INTO subscribers (email, name, tags, unsubscribe_token, status, current_step)
        VALUES (?, ?, ?, ?, 'active', 0)
      `)
      .bind(cleanEmail, cleanName, cleanTag, token)
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
   * 記錄發信狀態並以「條件式 UPDATE」原子推進 current_step（冪等，§7.5）。
   * 回傳 true 代表本呼叫完成推進；false 代表他處已處理（重疊執行防線）。
   */
  async recordSentAndAdvanceStep(
    subscriberId: number,
    sequenceId: number,
    nextStepNumber: number,
    messageId?: string
  ): Promise<boolean> {
    const advance = await this.db
      .prepare("UPDATE subscribers SET current_step = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND current_step = ?")
      .bind(nextStepNumber, subscriberId, nextStepNumber - 1)
      .run();
    if ((advance.meta.changes ?? 0) === 0) return false;
    await this.db
      .prepare(`
        INSERT INTO delivery_logs (subscriber_id, sequence_id, tosend_message_id, status)
        VALUES (?, ?, ?, 'sent')
      `)
      .bind(subscriberId, sequenceId, messageId || null)
      .run();
    return true;
  }

  /** 冪等檢查：該訂閱者是否已有此 sequence 的投遞紀錄 */
  async hasDeliveryLogFor(subscriberId: number, sequenceId: number): Promise<boolean> {
    const row = await this.db
      .prepare("SELECT 1 as x FROM delivery_logs WHERE subscriber_id = ? AND sequence_id = ? LIMIT 1")
      .bind(subscriberId, sequenceId)
      .first();
    return !!row;
  }

  /** 更新 campaigns 狀態（done / partial / failed） */
  async updateCampaignStatus(campaignId: number, status: 'done' | 'partial' | 'failed'): Promise<void> {
    await this.db
      .prepare("UPDATE campaigns SET status = ? WHERE id = ?")
      .bind(status, campaignId)
      .run();
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
      .prepare("SELECT * FROM subscribers WHERE status != 'deleted' ORDER BY id DESC LIMIT ?")
      .bind(limit)
      .all<Subscriber>();
    return results;
  }

  /** 管理 API：部分更新聯絡人（tags 覆蓋式且正規化） */
  async updateSubscriber(id: number, patch: { name?: string; tags?: string; status?: string }): Promise<boolean> {
    const sets: string[] = [];
    const params: any[] = [];
    if (patch.name !== undefined) { sets.push('name = ?'); params.push(patch.name); }
    if (patch.tags !== undefined) { sets.push('tags = ?'); params.push(normalizeTags(patch.tags)); }
    if (patch.status !== undefined) { sets.push('status = ?'); params.push(patch.status); }
    if (!sets.length) return false;
    sets.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    const res = await this.db
      .prepare(`UPDATE subscribers SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
    return (res.meta.changes ?? 0) > 0;
  }

  /** 軟刪除（FK 關係保留 delivery_logs，故不硬刪） */
  async softDeleteSubscriber(id: number): Promise<boolean> {
    return this.updateSubscriber(id, { status: 'deleted' });
  }

  /** 標籤清單（優先讀獨立表；表為空時 fallback 解析字串） */
  async listTags(): Promise<{ name: string; count: number }[]> {
    const rows = await this.listTagObjects();
    if (rows.length > 0) return rows.map(r => ({ name: r.name, count: r.count }));
    const { results } = await this.db
      .prepare("SELECT tags FROM subscribers WHERE tags != '' AND status != 'deleted'")
      .all<{ tags: string }>();
    const counts = new Map<string, number>();
    for (const row of results) {
      for (const t of row.tags.split(';')) {
        const name = t.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
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

  /**
   * 依標籤取得有效訂閱者名單
   */
  async getActiveSubscribersByTag(tag?: string): Promise<Subscriber[]> {
    if (!tag || tag === 'all') {
      const { results } = await this.db
        .prepare("SELECT * FROM subscribers WHERE status = 'active' ORDER BY id DESC")
        .all<Subscriber>();
      return results;
    }
    const { results } = await this.db
      .prepare("SELECT * FROM subscribers WHERE status = 'active' AND tags LIKE ? ESCAPE '\\' ORDER BY id DESC")
      .bind(`%;${tag.replace(/[%_\\]/g, (c) => '\\' + c)};%`)
      .all<Subscriber>();
    return results;
  }

  /**
   * 記錄個別發信或廣播信日誌
   */
  async recordDirectSendLog(params: {
    subscriberId: number;
    status: 'sent' | 'failed';
    messageId?: string;
    errorMsg?: string;
  }): Promise<void> {
    await this.db
      .prepare(`
        INSERT INTO delivery_logs (subscriber_id, sequence_id, tosend_message_id, status, error_message)
        VALUES (?, NULL, ?, ?, ?)
      `)
      .bind(params.subscriberId, params.messageId || null, params.status, params.errorMsg || null)
      .run();
  }

  /**
   * 儲存廣播活動紀錄
   */
  async saveCampaign(campaign: {
    name: string;
    subject: string;
    content_html: string;
    target_type: string;
    target_tag?: string;
    sent_count: number;
  }): Promise<number> {
    const res = await this.db
      .prepare(`
        INSERT INTO campaigns (name, subject, content_html, target_type, target_tag, sent_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        campaign.name,
        campaign.subject,
        campaign.content_html,
        campaign.target_type,
        campaign.target_tag || '',
        campaign.sent_count
      )
      .run();
    return res.meta.last_row_id as number;
  }

  // ── settings 鍵值存取 ────────────────────────────────

  /** 讀取單一設定；不存在回 null */
  async getSetting(key: string): Promise<{ key: string; value: string; is_encrypted: number } | null> {
    return await this.db
      .prepare('SELECT key, value, is_encrypted FROM settings WHERE key = ?')
      .bind(key)
      .first<{ key: string; value: string; is_encrypted: number }>();
  }

  /** 寫入設定（upsert） */
  async setSetting(key: string, value: string, isEncrypted = 0): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO settings (key, value, is_encrypted, updated_at)
         VALUES (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%SZ','now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, is_encrypted = excluded.is_encrypted, updated_at = excluded.updated_at`
      )
      .bind(key, value, isEncrypted)
      .run();
  }

  /** 刪除設定（忘記密碼救濟、金鑰重設用） */
  async deleteSetting(key: string): Promise<void> {
    await this.db.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
  }

  // ── Lists / Tags 獨立表（SR admin-accounts-lists-tags） ────────

  /** 標籤色盤：建立時自動輪替（對應 DESIGN.md 馬卡龍色盤） */
  static readonly TAG_COLORS = ['green', 'blue', 'yellow', 'red', 'purple', 'pink', 'orange', 'gray'];

  /**
   * 惰性遷移：把 subscribers.tags 字串回填到 tags / subscriber_tags（只跑一次）。
   * 顏色依首次出現順序輪替色盤。
   */
  async ensureListsTagsMigrated(): Promise<void> {
    const flag = await this.getSetting('lists_tags_migrated');
    if (flag?.value === '1') return;

    const { results } = await this.db
      .prepare("SELECT id, tags FROM subscribers WHERE tags != ''")
      .all<{ id: number; tags: string }>();

    let colorIdx = 0;
    const colorOf = new Map<string, string>();
    for (const row of results) {
      for (const raw of row.tags.split(';')) {
        const name = raw.trim();
        if (!name) continue;
        if (!colorOf.has(name)) {
          colorOf.set(name, DatabaseService.TAG_COLORS[colorIdx % DatabaseService.TAG_COLORS.length]);
          colorIdx++;
        }
        await this.db
          .prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)')
          .bind(name, colorOf.get(name))
          .run();
        const tag = await this.db.prepare('SELECT id FROM tags WHERE name = ?').bind(name).first<{ id: number }>();
        if (tag) {
          await this.db
            .prepare('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)')
            .bind(row.id, tag.id)
            .run();
        }
      }
    }
    await this.setSetting('lists_tags_migrated', '1');
  }

  /** 管理 API：名單清單（含人數） */
  async listLists(): Promise<{ id: number; name: string; description: string; count: number }[]> {
    const { results } = await this.db.prepare(`
      SELECT l.id, l.name, l.description,
        (SELECT COUNT(*) FROM subscriber_lists sl WHERE sl.list_id = l.id) AS count
      FROM lists l ORDER BY l.id ASC
    `).all();
    return results as any[];
  }

  async createList(name: string, description = ''): Promise<number> {
    const res = await this.db
      .prepare('INSERT INTO lists (name, description) VALUES (?, ?)')
      .bind(name.trim(), description)
      .run();
    return res.meta.last_row_id as number;
  }

  async renameList(id: number, name: string): Promise<boolean> {
    const res = await this.db.prepare('UPDATE lists SET name = ? WHERE id = ?').bind(name.trim(), id).run();
    return (res.meta.changes ?? 0) > 0;
  }

  /** 刪除名單（只移除歸屬，不刪聯絡人） */
  async deleteList(id: number): Promise<boolean> {
    await this.db.prepare('DELETE FROM subscriber_lists WHERE list_id = ?').bind(id).run();
    const res = await this.db.prepare('DELETE FROM lists WHERE id = ?').bind(id).run();
    return (res.meta.changes ?? 0) > 0;
  }

  /** 管理 API：標籤清單（含人數與顏色） */
  async listTagObjects(): Promise<{ id: number; name: string; color: string; count: number }[]> {
    const { results } = await this.db.prepare(`
      SELECT t.id, t.name, t.color,
        (SELECT COUNT(*) FROM subscriber_tags st WHERE st.tag_id = t.id) AS count
      FROM tags t ORDER BY t.id ASC
    `).all();
    return results as any[];
  }

  /** 依名稱找或建標籤（自動輪替顏色） */
  async findOrCreateTag(name: string): Promise<number> {
    const clean = name.trim();
    const existing = await this.db.prepare('SELECT id FROM tags WHERE name = ?').bind(clean).first<{ id: number }>();
    if (existing) return existing.id;
    const count = await this.db.prepare('SELECT COUNT(*) AS n FROM tags').first<{ n: number }>();
    const color = DatabaseService.TAG_COLORS[(count?.n ?? 0) % DatabaseService.TAG_COLORS.length];
    const res = await this.db
      .prepare('INSERT INTO tags (name, color) VALUES (?, ?)')
      .bind(clean, color)
      .run();
    return res.meta.last_row_id as number;
  }

  async renameTag(id: number, name: string): Promise<boolean> {
    const res = await this.db.prepare('UPDATE tags SET name = ? WHERE id = ?').bind(name.trim(), id).run();
    return (res.meta.changes ?? 0) > 0;
  }

  async setTagColor(id: number, color: string): Promise<boolean> {
    const res = await this.db.prepare('UPDATE tags SET color = ? WHERE id = ?').bind(color, id).run();
    return (res.meta.changes ?? 0) > 0;
  }

  /** 刪除標籤（同時從所有聯絡人撕掉） */
  async deleteTag(id: number): Promise<boolean> {
    await this.db.prepare('DELETE FROM subscriber_tags WHERE tag_id = ?').bind(id).run();
    const res = await this.db.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
    return (res.meta.changes ?? 0) > 0;
  }

  /** 覆寫某聯絡人的名單歸屬 */
  async setSubscriberLists(subscriberId: number, listIds: number[]): Promise<void> {
    await this.db.prepare('DELETE FROM subscriber_lists WHERE subscriber_id = ?').bind(subscriberId).run();
    for (const listId of listIds) {
      await this.db
        .prepare('INSERT OR IGNORE INTO subscriber_lists (subscriber_id, list_id) VALUES (?, ?)')
        .bind(subscriberId, listId)
        .run();
    }
  }

  /** 覆寫某聯絡人的標籤（依名稱 find-or-create） */
  async setSubscriberTagsByName(subscriberId: number, names: string[]): Promise<void> {
    await this.db.prepare('DELETE FROM subscriber_tags WHERE subscriber_id = ?').bind(subscriberId).run();
    for (const name of names) {
      if (!name.trim()) continue;
      const tagId = await this.findOrCreateTag(name);
      await this.db
        .prepare('INSERT OR IGNORE INTO subscriber_tags (subscriber_id, tag_id) VALUES (?, ?)')
        .bind(subscriberId, tagId)
        .run();
    }
  }

  /** 名單＋標籤一起覆寫，並同步 legacy tags 字串（dual-write 向後相容） */
  async setSubscriberAssociations(
    subscriberId: number,
    lists: { listIds?: number[]; tagNames?: string[] }
  ): Promise<void> {
    if (lists.listIds !== undefined) await this.setSubscriberLists(subscriberId, lists.listIds);
    if (lists.tagNames !== undefined) {
      await this.setSubscriberTagsByName(subscriberId, lists.tagNames);
      const clean = normalizeTags(lists.tagNames.join(';'));
      await this.db
        .prepare('UPDATE subscribers SET tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(clean, subscriberId)
        .run();
    }
  }

  /** 取得聯絡人的名單歸屬 */
  async getSubscriberLists(subscriberId: number): Promise<{ id: number; name: string }[]> {
    const { results } = await this.db.prepare(`
      SELECT l.id, l.name FROM subscriber_lists sl
      JOIN lists l ON l.id = sl.list_id
      WHERE sl.subscriber_id = ? ORDER BY l.id
    `).bind(subscriberId).all();
    return results as any[];
  }

  /** 取得聯絡人的標籤（含顏色） */
  async getSubscriberTags(subscriberId: number): Promise<{ id: number; name: string; color: string }[]> {
    const { results } = await this.db.prepare(`
      SELECT t.id, t.name, t.color FROM subscriber_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.subscriber_id = ? ORDER BY t.id
    `).bind(subscriberId).all();
    return results as any[];
  }

  /** 列出所有聯絡人，附上 lists/tags 陣列（管理後台一次載入） */
  async listSubscribersWithAssociations(limit = 500): Promise<any[]> {
    const subs = await this.listSubscribers(limit);
    const { results: sl } = await this.db.prepare(`
      SELECT sl.subscriber_id, l.id, l.name FROM subscriber_lists sl JOIN lists l ON l.id = sl.list_id
    `).all();
    const { results: st } = await this.db.prepare(`
      SELECT st.subscriber_id, t.id, t.name, t.color FROM subscriber_tags st JOIN tags t ON t.id = st.tag_id
    `).all();
    const listMap = new Map<number, any[]>(); const tagMap = new Map<number, any[]>();
    for (const r of sl as any[]) { if (!listMap.has(r.subscriber_id)) listMap.set(r.subscriber_id, []); listMap.get(r.subscriber_id)!.push({ id: r.id, name: r.name }); }
    for (const r of st as any[]) { if (!tagMap.has(r.subscriber_id)) tagMap.set(r.subscriber_id, []); tagMap.get(r.subscriber_id)!.push({ id: r.id, name: r.name, color: r.color }); }
    return subs.map(s => ({ ...s, lists: listMap.get(s.id) ?? [], tags_arr: tagMap.get(s.id) ?? [] }));
  }

  /** 依「名單聯集＋標籤要有／排除」取有效訂閱者（廣播受眾） */
  async getActiveSubscribersForAudience(filter: {
    listIds?: number[];
    includeTagIds?: number[];
    excludeTagIds?: number[];
  }): Promise<Subscriber[]> {
    const subs = await this.listSubscribersWithAssociations(100000);
    return subs.filter(s => {
      if (s.status !== 'active') return false;
      const subListIds = (s.lists as any[]).map(l => l.id);
      const subTagIds = (s.tags_arr as any[]).map(t => t.id);
      if (filter.listIds?.length && !filter.listIds.some(id => subListIds.includes(id))) return false;
      if (filter.includeTagIds?.length && !filter.includeTagIds.every(id => subTagIds.includes(id))) return false;
      if (filter.excludeTagIds?.length && filter.excludeTagIds.some(id => subTagIds.includes(id))) return false;
      return true;
    });
  }
}
