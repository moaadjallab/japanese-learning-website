/** Consistent JSON responses for API routes: { ok: true, ... } | { ok: false, error: { code, message, ... } }. */
export type ApiErrorCode =
  | 'bad_request'
  | 'validation_error'
  | 'forbidden'
  | 'captcha_failed'
  | 'rate_limited'
  | 'payload_too_large'
  | 'unsupported_media_type'
  | 'service_unavailable'
  | 'not_implemented'
  | 'internal_error'
  | 'invalid_credentials'
  | 'email_taken'
  | 'invalid_token';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

export const jsonOk = (data: Record<string, unknown> = {}, init: ResponseInit = {}) =>
  new Response(JSON.stringify({ ok: true, ...data }), {
    status: 200,
    ...init,
    headers: { ...JSON_HEADERS, ...init.headers },
  });

export const jsonError = (
  status: number,
  code: ApiErrorCode,
  message: string,
  extra: Record<string, unknown> = {},
  headers: HeadersInit = {},
) =>
  new Response(JSON.stringify({ ok: false, error: { code, message, ...extra } }), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });

/**
 * Standard 501 for V1 stubs (auth, payments). Clearly marked so nobody mistakes a stub
 * for a working endpoint.
 */
export const notImplemented = (feature: string, docs: string) =>
  jsonError(501, 'not_implemented', `${feature} is not implemented in V1.`, { docs });
