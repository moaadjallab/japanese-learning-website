/**
 * Adds security headers to on-demand responses (API routes, checkout, 404).
 * Prerendered pages get the same headers from dist/_headers.
 */
import { defineMiddleware } from 'astro:middleware';
import { SECURITY_HEADERS, buildCsp } from '@/lib/security/headers.js';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  if (context.isPrerendered) return response;
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!response.headers.has(name)) response.headers.set(name, value);
  }
  if (!response.headers.has('Content-Security-Policy')) {
    response.headers.set('Content-Security-Policy', buildCsp());
  }
  return response;
});
