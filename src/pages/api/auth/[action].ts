/**
 * /api/auth/* — email + password accounts on Cloudflare D1 (see AUTH_PLAN.md).
 *
 *   POST register         { fullName, email, password, confirmPassword, preferredLanguage, japaneseLevel }
 *   POST login            { email, password }
 *   POST logout           (JSON, or a plain form post → redirects to ?redirect=)
 *   GET  session
 *   POST forgot-password  { email, locale }       always 200 (no account enumeration)
 *   POST reset-password   { token, password, confirmPassword }
 *   POST resend-verification
 *
 * Answers 501 when the D1 binding is missing, so the UI falls back to "accounts coming soon".
 */
import type { APIContext, APIRoute } from 'astro';
import { jsonError, jsonOk } from '@/lib/api/response';
import {
  EmailTakenError,
  clearSessionCookies,
  consumeOneTimeToken,
  createOneTimeToken,
  createSession,
  createUser,
  deleteSession,
  deleteUserSessions,
  findUserByEmail,
  findUserById,
  getDb,
  getDummyHash,
  hashPassword,
  isSecureRequest,
  loadSession,
  SESSION_COOKIE,
  sendAuthEmail,
  setSessionCookies,
  updatePassword,
  verifyPassword,
} from '@/lib/auth/server';
import { createRateLimiter } from '@/lib/security/rateLimit';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validate,
} from '@/lib/validation/schemas';
import { isLocale } from '@/i18n/config';
import type { User } from '@/lib/auth/types';

export const prerender = false;

const MAX_BODY_BYTES = 10_000;
// Per Worker isolate (best effort) — add a Cloudflare WAF rate-limiting rule in production.
const loginLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
const registerLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
const emailLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

const clientIp = (ctx: APIContext) => {
  const header = ctx.request.headers.get('cf-connecting-ip');
  if (header) return header;
  try {
    return ctx.clientAddress;
  } catch {
    return 'unknown';
  }
};

const readJson = async (request: Request): Promise<unknown> => {
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) throw new Error('too_large');
  return raw ? JSON.parse(raw) : {};
};

const publicUser = (user: User) => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  roles: user.roles,
  preferredLanguage: user.preferredLanguage,
  japaneseLevel: user.japaneseLevel,
  emailVerified: user.emailVerified,
});

const rateLimited = (retryAfter: number) =>
  jsonError(429, 'rate_limited', 'Too many attempts.', {}, { 'Retry-After': String(retryAfter) });

const startSession = async (ctx: APIContext, db: D1Database, user: User) => {
  const { token, expiresAt } = await createSession(db, user.id, {
    ip: clientIp(ctx),
    userAgent: ctx.request.headers.get('user-agent'),
  });
  setSessionCookies(ctx.cookies, token, expiresAt, isSecureRequest(ctx.url));
};

const link = (ctx: APIContext, lang: string, path: string, token: string) =>
  new URL(`/${lang}/${path}/?token=${encodeURIComponent(token)}`, ctx.url.origin).href;

type Handler = (ctx: APIContext, db: D1Database) => Promise<Response>;

const handlers: Record<string, { method: 'GET' | 'POST'; run: Handler }> = {
  register: {
    method: 'POST',
    run: async (ctx, db) => {
      const rate = registerLimiter.check(clientIp(ctx));
      if (!rate.allowed) return rateLimited(rate.retryAfter);
      const result = validate(registerSchema, await readJson(ctx.request));
      if (!result.success)
        return jsonError(400, 'validation_error', 'Invalid input.', { fields: result.errors });
      const { fullName, email, password, preferredLanguage, japaneseLevel } = result.data;
      let user: User;
      try {
        user = await createUser(db, {
          fullName,
          email,
          preferredLanguage,
          japaneseLevel,
          passwordHash: await hashPassword(password),
        });
      } catch (error) {
        if (error instanceof EmailTakenError) {
          return jsonError(409, 'email_taken', 'An account already exists with this email.');
        }
        throw error;
      }
      await startSession(ctx, db, user);
      const token = await createOneTimeToken(db, user.id, 'email_verification');
      await sendAuthEmail('verify', user, link(ctx, user.preferredLanguage, 'verify-email', token));
      return jsonOk({ user: publicUser(user) });
    },
  },

  login: {
    method: 'POST',
    run: async (ctx, db) => {
      const result = validate(loginSchema, await readJson(ctx.request));
      if (!result.success)
        return jsonError(400, 'validation_error', 'Invalid input.', { fields: result.errors });
      const { email, password } = result.data;
      const rate = loginLimiter.check(`${clientIp(ctx)}:${email.toLowerCase()}`);
      if (!rate.allowed) return rateLimited(rate.retryAfter);
      const found = await findUserByEmail(db, email);
      // Always run a hash comparison so response time does not reveal whether the email exists.
      const valid = await verifyPassword(password, found?.passwordHash ?? (await getDummyHash()));
      if (!found || !valid) return jsonError(401, 'invalid_credentials', 'Email or password is incorrect.');
      await startSession(ctx, db, found.user);
      return jsonOk({ user: publicUser(found.user) });
    },
  },

  logout: {
    method: 'POST',
    run: async (ctx, db) => {
      const token = ctx.cookies.get(SESSION_COOKIE)?.value;
      if (token) await deleteSession(db, token);
      clearSessionCookies(ctx.cookies, isSecureRequest(ctx.url));
      // Plain HTML form posts (no JavaScript) are redirected back to a localized page.
      const type = ctx.request.headers.get('content-type') ?? '';
      if (!type.includes('application/json')) {
        const lang = ctx.url.searchParams.get('lang');
        return ctx.redirect(`/${isLocale(lang) ? lang : 'en'}/`, 303);
      }
      return jsonOk();
    },
  },

  session: {
    method: 'GET',
    run: async (ctx) => {
      const session = await loadSession(ctx);
      return jsonOk({
        session: session ? { expiresAt: session.expiresAt, user: publicUser(session.user) } : null,
      });
    },
  },

  'forgot-password': {
    method: 'POST',
    run: async (ctx, db) => {
      const body = (await readJson(ctx.request)) as Record<string, unknown>;
      const result = validate(forgotPasswordSchema, body);
      if (!result.success)
        return jsonError(400, 'validation_error', 'Invalid input.', { fields: result.errors });
      const rate = emailLimiter.check(`${clientIp(ctx)}:forgot`);
      if (!rate.allowed) return rateLimited(rate.retryAfter);
      const found = await findUserByEmail(db, result.data.email);
      if (found) {
        const token = await createOneTimeToken(db, found.user.id, 'password_reset');
        await sendAuthEmail(
          'reset',
          found.user,
          link(ctx, found.user.preferredLanguage, 'reset-password', token),
        );
      }
      // Same answer whether or not the account exists.
      return jsonOk();
    },
  },

  'reset-password': {
    method: 'POST',
    run: async (ctx, db) => {
      const result = validate(resetPasswordSchema, await readJson(ctx.request));
      if (!result.success)
        return jsonError(400, 'validation_error', 'Invalid input.', { fields: result.errors });
      const userId = await consumeOneTimeToken(db, result.data.token, 'password_reset');
      if (!userId) return jsonError(400, 'invalid_token', 'This link is invalid or has expired.');
      await updatePassword(db, userId, await hashPassword(result.data.password));
      // Sign out every device after a password change.
      await deleteUserSessions(db, userId);
      clearSessionCookies(ctx.cookies, isSecureRequest(ctx.url));
      return jsonOk();
    },
  },

  'resend-verification': {
    method: 'POST',
    run: async (ctx, db) => {
      const session = await loadSession(ctx);
      if (!session) return jsonError(401, 'forbidden', 'Not signed in.');
      const rate = emailLimiter.check(`${session.userId}:verify`);
      if (!rate.allowed) return rateLimited(rate.retryAfter);
      const user = await findUserById(db, session.userId);
      if (user && !user.emailVerified) {
        const token = await createOneTimeToken(db, user.id, 'email_verification');
        await sendAuthEmail('verify', user, link(ctx, user.preferredLanguage, 'verify-email', token));
      }
      // Plain form post from the account page (works without JavaScript).
      if (!(ctx.request.headers.get('content-type') ?? '').includes('application/json')) {
        const lang = ctx.url.searchParams.get('lang');
        return ctx.redirect(`/${isLocale(lang) ? lang : 'en'}/account/?verification=sent`, 303);
      }
      return jsonOk();
    },
  },
};

export const ALL: APIRoute = async (ctx) => {
  const handler = handlers[ctx.params.action ?? ''];
  if (!handler) return jsonError(404, 'bad_request', 'Unknown auth action.');
  if (ctx.request.method !== handler.method) {
    return jsonError(405, 'bad_request', 'Method not allowed.', {}, { Allow: handler.method });
  }
  const db = getDb(ctx.locals);
  if (!db) return jsonError(501, 'not_implemented', 'Accounts are not configured (missing D1 binding "DB").');
  try {
    return await handler.run(ctx, db);
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message === 'too_large')) {
      return jsonError(400, 'bad_request', 'Invalid request body.');
    }
    console.error(`[auth] ${ctx.params.action} failed:`, error);
    return jsonError(500, 'internal_error', 'Something went wrong.');
  }
};
