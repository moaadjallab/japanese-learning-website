/**
 * On-demand requests only (pages with `prerender = false` and API routes):
 * 1. resolve the session cookie into `Astro.locals.session` (pages that need it);
 * 2. add security headers (prerendered pages get the same headers from dist/_headers).
 */
import { defineMiddleware } from 'astro:middleware';
import { SECURITY_HEADERS, buildCsp } from '@/lib/security/headers.js';
import { loadSession } from '@/lib/auth/server';

export const onRequest = defineMiddleware(async (context, next) => {
  context.locals.session = null;
  if (context.isPrerendered) return next();

  // API routes resolve the session themselves when they need it.
  if (!context.url.pathname.startsWith('/api/')) {
    context.locals.session = await loadSession(context);
  }

  const response = await next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  if (!response.headers.has('Content-Security-Policy')) {
    response.headers.set('Content-Security-Policy', buildCsp());
  }
  // Personalized responses must never be cached by shared caches.
  if (context.locals.session) response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
