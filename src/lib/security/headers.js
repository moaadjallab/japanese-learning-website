// @ts-check
/**
 * Security headers — single source of truth, plain JS so both the Worker
 * (src/middleware.ts) and the post-build script (scripts/postbuild-csp.mjs) import it.
 */
export const THIRD_PARTY = Object.freeze({
  turnstile: 'https://challenges.cloudflare.com',
  analyticsScript: 'https://static.cloudflareinsights.com',
  analyticsBeacon: 'https://cloudflareinsights.com',
  // Lesson video embeds (src/content/lessons.json → videoUrl).
  video: 'https://www.youtube-nocookie.com https://player.vimeo.com https://*.cloudflarestream.com',
});

/**
 * Build the Content-Security-Policy. `scriptHashes` are 'sha256-…' sources for inline scripts.
 * @param {string[]} [scriptHashes]
 * @returns {string}
 */
export const buildCsp = (scriptHashes = []) =>
  [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.join(' ')} ${THIRD_PARTY.turnstile} ${THIRD_PARTY.analyticsScript}`.replace(
      /\s+/g,
      ' ',
    ),
    // Astro inlines small critical stylesheets; inline styles carry no script execution risk.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${THIRD_PARTY.analyticsBeacon}`,
    `frame-src ${THIRD_PARTY.turnstile} ${THIRD_PARTY.video}`,
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

/** @type {Record<string, string>} */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
