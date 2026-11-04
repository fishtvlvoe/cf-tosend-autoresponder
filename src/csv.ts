/**
 * 好寄 CSV 模組（csv.ts）
 *
 * 職責：名單 CSV 的解析與產生（規格書 §7.2 全部規則）。
 *
 * 匯入格式：email,name,tags（逗號分隔三欄；tags 欄內多標籤用半形分號）
 * 明確不支援：引號包裹、欄位內逗號或換行（偵測到引號開頭即回錯）。
 * 列號：從 1 算起、含標頭列（與 Excel 列號一致，方便學員對照錯誤明細）。
 */

import { normalizeTags } from './types';

export interface CsvRow {
  email: string;
  name: string;
  tags: string; // 已正規化為 ;a;b;
}

export interface CsvError {
  row: number;
  email: string;
  reason: string;
}

export interface CsvParseResult {
  rows: CsvRow[];
  errors: CsvError[];
  total: number;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** UTF-8 嚴格解碼（含 BOM 剝除）；非 UTF-8 直接拋錯 */
export function decodeCsvText(buf: ArrayBuffer): string {
  // BOM 剝除
  const bytes = new Uint8Array(buf);
  const noBom =
    bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
      ? bytes.subarray(3)
      : bytes;
  const decoder = new TextDecoder('utf-8', { fatal: true } as TextDecoderConstructorOptions);
  return decoder.decode(noBom);
}

/**
 * 解析 CSV 文字。
 * 規則：首列第一欄（去空白小寫）= email → 視為標頭略過；
 * 空列跳過；同檔重複 email → 後列蓋前列。
 */
export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r?\n/);
  const rows: CsvRow[] = [];
  const errors: CsvError[] = [];
  const seen = new Map<string, number>(); // email → rows 索引
  let total = 0;

  const hasHeader = lines.length > 0 && lines[0].split(',')[0]?.trim().toLowerCase() === 'email';

  lines.forEach((rawLine, idx) => {
    const lineNo = idx + 1; // 含標頭列
    const line = rawLine.trim();
    if (lineNo === 1 && hasHeader) return;
    if (!line) return;
    total++;

    if (line.startsWith('"')) {
      errors.push({ row: lineNo, email: '', reason: '不支援引號包裹格式，請移除雙引號' });
      return;
    }

    const parts = rawLine.split(',');
    if (parts.length < 1) return;
    const email = (parts[0] || '').trim().toLowerCase();
    const name = (parts[1] || '').trim();
    const tagsRaw = parts.slice(2).join(',').trim(); // 第三欄起都當 tags（內部再用分號切）

    if (!email) {
      errors.push({ row: lineNo, email: '', reason: 'Email 為空白' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: lineNo, email, reason: 'Email 格式不正確' });
      return;
    }

    const row: CsvRow = { email, name, tags: normalizeTags(tagsRaw || '一般訂閱') };
    const dupIdx = seen.get(email);
    if (dupIdx !== undefined) {
      rows[dupIdx] = row; // 後列蓋前列
      return;
    }
    seen.set(email, rows.length);
    rows.push(row);
  });

  return { rows, errors, total };
}

/** 產生匯出 CSV：欄位 email,name,tags,status,created_at，BOM 開頭，日期 YYYY-MM-DD HH:mm（UTC+8） */
export function buildCsv(subscribers: {
  email: string;
  name: string;
  tags?: string | null;
  status: string;
  created_at?: string | null;
}[]): string {
  const esc = (v: string) => (v.includes(',') ? v.replace(/,/g, ' ') : v);
  const fmtDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso.endsWith('Z') ? iso : iso.replace(' ', 'T') + 'Z');
    const tw = new Date(d.getTime() + 8 * 3600 * 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${tw.getUTCFullYear()}-${p(tw.getUTCMonth() + 1)}-${p(tw.getUTCDate())} ${p(tw.getUTCHours())}:${p(tw.getUTCMinutes())}`;
  };
  const lines = subscribers.map(
    (s) =>
      [esc(s.email), esc(s.name || ''), esc((s.tags || '').replace(/^;|;$/g, '').replace(/;/g, ';')), s.status, fmtDate(s.created_at)].join(',')
  );
  return '\uFEFF' + ['email,name,tags,status,created_at', ...lines].join('\r\n');
}
