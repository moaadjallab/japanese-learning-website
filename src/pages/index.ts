/**
 * Root "/" → /en/ or /ar/ based on the Accept-Language header (fallback: en).
 * Rendered on demand by the Cloudflare Worker; `Vary` keeps caches correct.
 */
import type { APIRoute } from 'astro';
import { negotiateLocale } from '@/i18n';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const locale = negotiateLocale(request.headers.get('accept-language'));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${locale}/`,
      Vary: 'Accept-Language',
      'Cache-Control': 'private, max-age=0',
    },
  });
};
