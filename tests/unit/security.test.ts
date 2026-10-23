import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/email';

describe('rate limiter', () => {
  it('allows up to the limit per window, then blocks until reset', () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check('ip', 0).allowed).toBe(true);
    expect(limiter.check('ip', 10).allowed).toBe(true);
    const third = limiter.check('ip', 20);
    expect(third.allowed).toBe(false);
    expect(third.retryAfter).toBe(1);
    expect(limiter.check('other', 20).allowed).toBe(true);
    expect(limiter.check('ip', 1001).allowed).toBe(true);
  });
});

describe('turnstile', () => {
  it('fails closed without a token or on errors', async () => {
    expect(await verifyTurnstile('secret', undefined)).toBe(false);
    const failing = vi.fn().mockRejectedValue(new Error('network'));
    expect(await verifyTurnstile('secret', 'tok', null, failing)).toBe(false);
  });
  it('accepts a successful verification', async () => {
    const ok = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    expect(await verifyTurnstile('secret', 'tok', '1.2.3.4', ok)).toBe(true);
  });
});

describe('escapeHtml', () => {
  it('escapes user input for HTML emails', () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;',
    );
  });
});
