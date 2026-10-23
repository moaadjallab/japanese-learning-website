/**
 * Server-side auth entry point (Worker only — never import from client code).
 * Implements AUTH_PLAN.md with hand-rolled, dependency-free sessions on Cloudflare D1.
 */
import { CONTACT_FROM_EMAIL, RESEND_API_KEY } from 'astro:env/server';
import type { APIContext, AstroGlobal } from 'astro';
import { site } from '@/config/site';
import { getDictionary, interpolate } from '@/i18n';
import { escapeHtml, getEmailProvider } from '@/lib/email';
import type { Session, User } from '../types';
import { SESSION_COOKIE, clearSessionCookies, isSecureRequest, setSessionCookies } from './cookies';
import { validateSession } from './repository';

export * from './cookies';
export * from './crypto';
export * from './repository';

type Ctx = Pick<APIContext, 'locals' | 'cookies' | 'url'> | Pick<AstroGlobal, 'locals' | 'cookies' | 'url'>;

/** The D1 binding, or null when it is not configured (the API then answers 501). */
export const getDb = (locals: App.Locals): D1Database | null => locals.runtime?.env?.DB ?? null;

/** Read and validate the session cookie; refreshes or clears cookies as needed. */
export const loadSession = async (ctx: Ctx): Promise<Session | null> => {
  const token = ctx.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb(ctx.locals);
  if (!db) return null;
  const secure = isSecureRequest(ctx.url);
  try {
    const result = await validateSession(db, token);
    if (!result) {
      clearSessionCookies(ctx.cookies, secure);
      return null;
    }
    if (result.renewedExpiresAt) setSessionCookies(ctx.cookies, token, result.renewedExpiresAt, secure);
    return result.session;
  } catch (error) {
    console.error('[auth] session lookup failed:', error);
    return null;
  }
};

/* -------------------------------------------------------------------- emails */

type AuthEmail = 'verify' | 'reset';

/**
 * Send a verification or password-reset email in the user's preferred language.
 * Never throws: a failed email must not break registration (the user can request another).
 * In development without RESEND_API_KEY the console adapter prints the email (with the link).
 */
export const sendAuthEmail = async (kind: AuthEmail, user: User, link: string): Promise<void> => {
  const lang = user.preferredLanguage;
  const d = getDictionary(lang).emails;
  const brand = site.name[lang];
  const provider = getEmailProvider({ resendApiKey: RESEND_API_KEY, isDev: import.meta.env.DEV });
  const from =
    CONTACT_FROM_EMAIL ?? (import.meta.env.DEV ? `${site.name.en} <no-reply@example.com>` : undefined);
  if (!provider || !from) {
    console.error('[auth] Email delivery is not configured; could not send', kind, 'email.');
    return;
  }
  const subject = kind === 'verify' ? d.verifySubject : d.resetSubject;
  const body = interpolate(kind === 'verify' ? d.verifyBody : d.resetBody, { brand });
  const lines = [
    interpolate(d.greeting, { name: user.fullName }),
    '',
    body,
    link,
    '',
    d.ignore,
    '',
    interpolate(d.signature, { brand }),
  ];
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const html = `<div dir="${dir}" lang="${lang}" style="font-family:system-ui,sans-serif;line-height:1.6">
<p>${escapeHtml(lines[0] ?? '')}</p><p>${escapeHtml(body)}</p>
<p><a href="${escapeHtml(link)}" style="color:#C8312B;font-weight:600">${escapeHtml(link)}</a></p>
<p style="color:#5F5A52">${escapeHtml(d.ignore)}</p><p>${escapeHtml(interpolate(d.signature, { brand }))}</p></div>`;
  try {
    await provider.send({
      to: user.email,
      from,
      subject: `${subject} — ${brand}`,
      text: lines.join('\n'),
      html,
    });
  } catch (error) {
    console.error('[auth] Failed to send', kind, 'email:', error);
  }
};
