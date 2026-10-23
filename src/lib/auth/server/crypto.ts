/**
 * Password hashing and token helpers built on Web Crypto (works in Cloudflare Workers and Node).
 *
 * Passwords: PBKDF2-HMAC-SHA256, 100,000 iterations (the maximum the Workers runtime allows),
 * 16-byte random salt, 32-byte key. Stored as `pbkdf2$<iterations>$<salt b64url>$<hash b64url>`
 * so the parameters can be raised later without breaking existing hashes.
 */
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;
const encoder = new TextEncoder();

export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const fromBase64Url = (value: string): Uint8Array<ArrayBuffer> => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

/** Cryptographically random URL-safe token (default 32 bytes = 256 bits). */
export const randomToken = (bytes = 32): string => toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));

/** Hex SHA-256 — tokens are stored hashed, so a database leak does not leak live sessions. */
export const sha256Hex = async (value: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const derive = async (
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> => {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
};

/** Constant-time comparison of two byte arrays. */
export const timingSafeEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
};

export const verifyPassword = async (
  password: string,
  stored: string | null | undefined,
): Promise<boolean> => {
  if (!stored) return false;
  const [scheme, iter, salt, hash] = stored.split('$');
  const iterations = Number(iter);
  if (scheme !== 'pbkdf2' || !salt || !hash || !Number.isInteger(iterations) || iterations < 1) return false;
  const actual = await derive(password, fromBase64Url(salt), iterations);
  return timingSafeEqual(actual, fromBase64Url(hash));
};

/**
 * A valid hash of a random password, used to spend the same time verifying a password
 * when the email does not exist (prevents user enumeration by timing).
 */
let dummyHash: Promise<string> | undefined;
export const getDummyHash = () => (dummyHash ??= hashPassword(randomToken(16)));
