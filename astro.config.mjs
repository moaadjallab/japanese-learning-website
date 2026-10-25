// @ts-check
import { defineConfig, envField } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

// Public production URL. Override with SITE_URL at build time (see .env.example).
const SITE_URL = process.env.SITE_URL || 'https://www.example.com';

// Paths (without locale prefix) that must never appear in the sitemap (noindex pages).
const NOINDEX_SEGMENTS = ['/login', '/register', '/forgot-password', '/checkout', '/legal/', '/_styleguide'];

// Home, catalog and course pages render on demand (they follow the admin course editor), so the
// sitemap integration can't discover them: list them here (built-in courses from courses.json).
/** @type {string[]} */
const courseSlugs = JSON.parse(
  readFileSync(new URL('./src/content/courses.json', import.meta.url), 'utf8'),
).map((/** @type {{ id: string }} */ course) => course.id);
const ON_DEMAND_PAGES = ['en', 'ar'].flatMap((lang) =>
  ['/', '/courses/', ...courseSlugs.map((slug) => `/courses/${slug}/`)].map(
    (path) => new URL(`/${lang}${path}`, SITE_URL).href,
  ),
);

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  devToolbar: { enabled: false },
  output: 'static',
  // Sessions are not used in V1; avoid requiring a KV binding.
  session: { driver: 'null' },
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: { enabled: true },
  }),
  i18n: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    routing: {
      prefixDefaultLocale: true,
      // The root "/" is handled by src/pages/index.ts (Accept-Language negotiation).
      redirectToDefaultLocale: false,
    },
  },
  integrations: [
    react(),
    sitemap({
      customPages: ON_DEMAND_PAGES,
      filter: (page) => !NOINDEX_SEGMENTS.some((seg) => new URL(page).pathname.includes(seg)),
      i18n: { defaultLocale: 'en', locales: { en: 'en', ar: 'ar' } },
    }),
  ],
  env: {
    schema: {
      // ---- Server-only secrets (set in Cloudflare dashboard / .dev.vars) ----
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_TO_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      CONTACT_FROM_EMAIL: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURNSTILE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      CHECKOUT_URL_BASIC: envField.string({ context: 'server', access: 'secret', optional: true }),
      CHECKOUT_URL_PREMIUM: envField.string({ context: 'server', access: 'secret', optional: true }),
      CHECKOUT_URL_PRIVATE: envField.string({ context: 'server', access: 'secret', optional: true }),
      // ---- Public, inlined at build time ----
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_CF_ANALYTICS_TOKEN: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  build: {
    // Inline small stylesheets; the shared ~12 KB (gzipped) stylesheet stays external and cacheable.
    inlineStylesheets: 'auto',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Keep scripts external so the Content-Security-Policy can stay strict (see scripts/csp-hashes.mjs).
      assetsInlineLimit: 0,
    },
  },
});
