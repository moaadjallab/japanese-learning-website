/**
 * On-demand requests only (pages with `prerender = false` and API routes):
 * 1. resolve the session cookie into `Astro.locals.session` (pages that need it);
 * 2. add security headers (prerendered pages get the same headers from dist/_headers).
 *    HTML pages get a CSP that allows their own inline scripts (Astro island bootstrap) by hash.
 */
import { defineMiddleware } from 'astro:middleware';
import { SECURITY_HEADERS, buildCsp, inlineScriptBodies } from '@/lib/security/headers.js';
import { loadSession } from '@/lib/auth/server';

const sha256Base64 = async (text: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return btoa(String.fromCharCode(...digest));
};

/** Same response with a CSP listing the hashes of the page's inline scripts. */
const withHtmlCsp = async (response: Response) => {
  const html = await response.text();
  const hashes = await Promise.all(
    [...new Set(inlineScriptBodies(html))].map(async (body) => `'sha256-${await sha256Base64(body)}'`),
  );
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', buildCsp(hashes));
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
};

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.session = null;
  if (context.isPrerendered) return next();

  // API routes resolve the session themselves when they need it.
  if (!context.url.pathname.startsWith('/api/')) {
    context.locals.session = await loadSession(context);
  }

  let response = await next();
  if (!response.headers.has('Content-Security-Policy')) {
    const isHtml = (response.headers.get('Content-Type') ?? '').includes('text/html');
    if (isHtml && response.body) response = await withHtmlCsp(response);
    else response.headers.set('Content-Security-Policy', buildCsp());
  }
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  // Personalized responses must never be cached by shared caches.
  if (context.locals.session) response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
