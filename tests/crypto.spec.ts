import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, encryptSecret, decryptSecret, newSessionToken } from '../src/crypto';

describe('密碼雜湊（PBKDF2-SHA256 310k）', () => {
  it('雜湊格式正確且每次 salt 不同', async () => {
    const h1 = await hashPassword('my-secret-password');
    const h2 = await hashPassword('my-secret-password');
    expect(h1).toMatch(/^pbkdf2:310000:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(h1).not.toBe(h2); // salt 隨機
  });

  it('正確密碼通過驗證', async () => {
    const h = await hashPassword('正確密碼123');
    expect(await verifyPassword('正確密碼123', h)).toBe(true);
  });

  it('錯誤密碼拒絕', async () => {
    const h = await hashPassword('正確密碼123');
    expect(await verifyPassword('錯誤密碼456', h)).toBe(false);
  });

  it('空密碼不得通過（後門防禦）', async () => {
    const h = await hashPassword('real-password');
    expect(await verifyPassword('', h)).toBe(false);
  });

  it('格式不符的 stored 字串回 false 不拋例外', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'scrypt:1:2:3')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });
});

describe('AES-256-GCM 金鑰加解密', () => {
  it('round-trip：解密後與明文一致', async () => {
    const ct = await encryptSecret('sk-tosend-live-key-abc123', 'test-secret-key');
    expect(ct).toMatch(/^[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(await decryptSecret(ct, 'test-secret-key')).toBe('sk-tosend-live-key-abc123');
  });

  it('同明文每次密文不同（IV 隨機）', async () => {
    const a = await encryptSecret('same', 'k');
    const b = await encryptSecret('same', 'k');
    expect(a).not.toBe(b);
  });

  it('金鑰錯誤（HAOJI_SECRET 變更）解密失敗拋出例外', async () => {
    const ct = await encryptSecret('secret-data', 'old-secret');
    await expect(decryptSecret(ct, 'new-secret')).rejects.toThrow();
  });

  it('密文遭竄改（tag 驗證失敗）解密失敗', async () => {
    const ct = await encryptSecret('secret-data', 'k');
    const [iv, data] = ct.split(':');
    const bytes = Buffer.from(data, 'base64');
    bytes[0] = bytes[0] ^ 1; // 竄改第一 byte
    await expect(decryptSecret(`${iv}:${bytes.toString('base64')}`, 'k')).rejects.toThrow();
  });
});

describe('session token', () => {
  it('產生 32-byte base64 且不重複', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).not.toBe(b);
    expect(Buffer.from(a, 'base64').length).toBe(32);
  });
});
