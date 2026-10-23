/**
 * Session cookies.
 * - `na_session`: the secret session token (HttpOnly, Secure on https, SameSite=Lax).
 * - `na_auth`: a non-secret "1" flag readable by JavaScript, so static (prerendered) pages can
 *   show "My account" instead of "Login" without an extra request. It grants nothing by itself.
 */
import type { AstroCookies } from 'astro';

export const SESSION_COOKIE = 'na_session';
export const AUTH_HINT_COOKIE = 'na_auth';

const base = (secure: boolean) => ({ path: '/', sameSite: 'lax' as const, secure });

export const setSessionCookies = (cookies: AstroCookies, token: string, expires: Date, secure: boolean) => {
  cookies.set(SESSION_COOKIE, token, { ...base(secure), httpOnly: true, expires });
  cookies.set(AUTH_HINT_COOKIE, '1', { ...base(secure), httpOnly: false, expires });
};

export const clearSessionCookies = (cookies: AstroCookies, secure: boolean) => {
  cookies.delete(SESSION_COOKIE, base(secure));
  cookies.delete(AUTH_HINT_COOKIE, base(secure));
};

export const isSecureRequest = (url: URL) => url.protocol === 'https:';
