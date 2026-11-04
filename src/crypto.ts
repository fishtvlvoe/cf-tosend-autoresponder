/**
 * 好寄密碼學模組（crypto.ts）
 *
 * 職責：後台密碼雜湊與敏感設定值（ToSend API Key）的加解密。
 *
 * 密碼雜湊：PBKDF2-SHA256（310,000 次迭代、16B 隨機 salt、32B 輸出）。
 *   ※ 規格書原定 scrypt，但 Web Crypto（Workers 與 Node 22 共通介面）未提供
 *     scrypt，依金魚審查允許的替代方案定案為 PBKDF2(310k)。
 *   格式：pbkdf2:310000:saltB64:hashB64
 *
 * 金鑰加密：AES-256-GCM。
 *   金鑰 = SHA-256(UTF-8(HAOJI_SECRET))，IV 12B 隨機，
 *   輸出格式：base64(iv):base64(ciphertext 含 16B authTag)。
 *   解密失敗（含 tag 驗證失敗）代表 HAOJI_SECRET 已變更，由呼叫端提示重設。
 *
 * 所有函式同時可在 Cloudflare Workers（Web Crypto）與 Node 22（vitest）執行。
 */

const PBKDF2_ITERATIONS = 310000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const IV_BYTES = 12;

const te = new TextEncoder();
const td = new TextDecoder();

function b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  if (typeof btoa !== 'undefined') {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  }
  return (globalThis as any).Buffer.from(bytes).toString('base64');
}

function unb64(s: string): Uint8Array {
  if (typeof atob !== 'undefined') {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array((globalThis as any).Buffer.from(s, 'base64'));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ── 密碼雜湊 ──────────────────────────────────────────────

/** 產生 PBKDF2 密碼雜湊字串（格式 pbkdf2:310000:saltB64:hashB64） */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS },
    key,
    KEY_BYTES * 8,
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${b64(salt)}:${b64(bits)}`;
}

/** 驗證密碼（常數時間比對；格式不符一律回 false） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000) return false;
  const salt = unb64(parts[2]);
  const expected = unb64(parts[3]);
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
  const key = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BYTES * 8,
  );
  return timingSafeEqual(new Uint8Array(bits), expected);
}

// ── AES-256-GCM 金鑰加解密 ────────────────────────────────

async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', te.encode(secret));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** 加密敏感值，輸出 base64(iv):base64(ciphertext 含 authTag) */
export async function encryptSecret(plaintext: string, secret: string): Promise<string> {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, te.encode(plaintext));
  return `${b64(iv)}:${b64(ct)}`;
}

/** 解密；失敗（金鑰變更 / 資料損壞）會拋出例外，由呼叫端轉為「請重新驗證」提示 */
export async function decryptSecret(payload: string, secret: string): Promise<string> {
  const [ivPart, ctPart] = payload.split(':');
  if (!ivPart || !ctPart) throw new Error('密文格式錯誤');
  const key = await deriveAesKey(secret);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(ivPart) as BufferSource },
    key,
    unb64(ctPart) as BufferSource,
  );
  return td.decode(pt);
}

/** 產生 32-byte 隨機 session token（base64） */
export function newSessionToken(): string {
  return b64(crypto.getRandomValues(new Uint8Array(32)));
}
