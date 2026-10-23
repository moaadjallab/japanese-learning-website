import { describe, expect, it } from 'vitest';
import {
  fromBase64Url,
  hashPassword,
  randomToken,
  sha256Hex,
  timingSafeEqual,
  toBase64Url,
  verifyPassword,
} from '@/lib/auth/server/crypto';

describe('password hashing', () => {
  it('verifies the right password and rejects others', async () => {
    const hash = await hashPassword('sakura2026');
    expect(hash).toMatch(/^pbkdf2\$100000\$[\w-]+\$[\w-]+$/);
    expect(await verifyPassword('sakura2026', hash)).toBe(true);
    expect(await verifyPassword('sakura2027', hash)).toBe(false);
    expect(await verifyPassword('', hash)).toBe(false);
  });

  it('uses a random salt (same password, different hashes)', async () => {
    expect(await hashPassword('same-pass1')).not.toBe(await hashPassword('same-pass1'));
  });

  it('rejects malformed or missing hashes', async () => {
    expect(await verifyPassword('x', null)).toBe(false);
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$10$abc$def')).toBe(false);
  });
});

describe('tokens', () => {
  it('generates unique URL-safe tokens', () => {
    const a = randomToken();
    expect(a).toMatch(/^[\w-]{43}$/);
    expect(randomToken()).not.toBe(a);
  });

  it('hashes tokens with SHA-256', async () => {
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('round-trips base64url and compares in constant time', () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255]);
    expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes]);
    expect(timingSafeEqual(bytes, new Uint8Array(bytes))).toBe(true);
    expect(timingSafeEqual(bytes, new Uint8Array([0, 1, 2, 250, 251, 254]))).toBe(false);
    expect(timingSafeEqual(bytes, new Uint8Array(3))).toBe(false);
  });
});
