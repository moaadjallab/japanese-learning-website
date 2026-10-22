/**
 * POST /api/contact — contact form submission.
 * Steps: same-origin check → size & content-type limits → rate limit → Zod validation
 * → honeypot → Cloudflare Turnstile → send email (Resend adapter by default).
 */
import type { APIRoute } from 'astro';
import { CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL, RESEND_API_KEY, TURNSTILE_SECRET_KEY } from 'astro:env/server';
import { site } from '@/config/site';
import { jsonError, jsonOk } from '@/lib/api/response';
import { escapeHtml, getEmailProvider } from '@/lib/email';
import { createRateLimiter } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { contactSchema, validate } from '@/lib/validation/schemas';

export const prerender = false;

const MAX_BODY_BYTES = 20_000;
// 5 messages per IP per 10 minutes (per Worker isolate — see rateLimit.ts).
const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60 * 1000 });

const getClientIp = (request: Request, clientAddress: () => string) => {
  const header = request.headers.get('cf-connecting-ip');
  if (header) return header;
  try {
    return clientAddress();
  } catch {
    return 'unknown';
  }
};

export const POST: APIRoute = async (context) => {
  const { request, url } = context;
  const isDev = import.meta.env.DEV;

  // 1. Same-origin only (basic CSRF protection for a JSON endpoint).
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) {
    return jsonError(403, 'forbidden', 'Cross-origin requests are not allowed.');
  }

  // 2. Content type & size.
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return jsonError(415, 'unsupported_media_type', 'Expected application/json.');
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonError(413, 'payload_too_large', 'Message is too large.');
  }

  // 3. Rate limit by client IP.
  const ip = getClientIp(request, () => context.clientAddress);
  const rate = limiter.check(ip);
  if (!rate.allowed) {
    return jsonError(
      429,
      'rate_limited',
      'Too many requests.',
      {},
      { 'Retry-After': String(rate.retryAfter) },
    );
  }

  // 4. Validate.
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(400, 'bad_request', 'Invalid JSON.');
  }
  const result = validate(contactSchema, body);
  if (!result.success) {
    // Honeypot hit: pretend success so bots learn nothing.
    if (result.errors.website) return jsonOk();
    return jsonError(400, 'validation_error', 'Invalid input.', { fields: result.errors });
  }
  const data = result.data;

  // 5. Turnstile (required in production).
  if (TURNSTILE_SECRET_KEY) {
    const human = await verifyTurnstile(TURNSTILE_SECRET_KEY, data.turnstileToken, ip);
    if (!human) return jsonError(403, 'captcha_failed', 'Security check failed.');
  } else if (!isDev) {
    console.error('[contact] TURNSTILE_SECRET_KEY is not configured.');
    return jsonError(503, 'service_unavailable', 'Contact form is not configured.');
  }

  // 6. Send.
  const provider = getEmailProvider({ resendApiKey: RESEND_API_KEY, isDev });
  const to = CONTACT_TO_EMAIL ?? (isDev ? site.contact.email : undefined);
  const from = CONTACT_FROM_EMAIL ?? (isDev ? `${site.name.en} <no-reply@example.com>` : undefined);
  if (!provider || !to || !from) {
    console.error(
      '[contact] Email delivery is not configured (RESEND_API_KEY / CONTACT_TO_EMAIL / CONTACT_FROM_EMAIL).',
    );
    return jsonError(503, 'service_unavailable', 'Contact form is not configured.');
  }

  const subject = `[${site.name.en}] ${data.subject}`;
  const text = [
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Language: ${data.locale}`,
    `Subject: ${data.subject}`,
    '',
    data.message,
  ].join('\n');
  const html = `<p><strong>Name:</strong> ${escapeHtml(data.name)}<br><strong>Email:</strong> ${escapeHtml(
    data.email,
  )}<br><strong>Language:</strong> ${data.locale}</p><p><strong>Subject:</strong> ${escapeHtml(
    data.subject,
  )}</p><p style="white-space:pre-wrap">${escapeHtml(data.message)}</p>`;

  try {
    await provider.send({ to, from, replyTo: data.email, subject, text, html });
  } catch (error) {
    console.error('[contact] Email send failed:', error);
    return jsonError(502, 'internal_error', 'Could not send the message.');
  }
  return jsonOk();
};

export const ALL: APIRoute = () =>
  jsonError(405, 'bad_request', 'Method not allowed.', {}, { Allow: 'POST' });
