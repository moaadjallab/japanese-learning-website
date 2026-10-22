import { describe, expect, it, vi } from 'vitest';
import { isActivePath, routes, stripLocale, switchLocalePath } from '@/lib/routes';
import {
  filterCourses,
  levelRangeLabel,
  normalizeSearch,
  parseFilters,
  serializeFilters,
} from '@/lib/catalog/filter';
import { formatPrice, PRICE_PLACEHOLDER } from '@/lib/pricing';
import { createRateLimiter } from '@/lib/security/rateLimit';
import { verifyTurnstile } from '@/lib/security/turnstile';
import { escapeHtml } from '@/lib/email';
import { guardRoute, AREA_ROLES } from '@/lib/auth/guard';
import { HttpAuthService, AuthNotAvailableError } from '@/lib/auth/AuthService';
import { ExternalLinkPaymentProvider } from '@/lib/payments/adapters/externalLink';
import { NotImplementedPaymentProvider } from '@/lib/payments/adapters/notImplemented';
import { PaymentsNotAvailableError } from '@/lib/payments/types';
import type { Session } from '@/lib/auth/types';
import type { CourseCardData } from '@/lib/domain/types';
import { en } from '@/i18n/en';

describe('routes', () => {
  it('builds localized URLs', () => {
    expect(routes.home('ar')).toBe('/ar/');
    expect(routes.course('en', 'kanji')).toBe('/en/courses/kanji/');
    expect(routes.checkout('ar', 'premium')).toBe('/ar/checkout/?plan=premium');
    expect(routes.courses('en', { level: 'n5', category: 'jlpt' })).toBe(
      '/en/courses/?level=n5&category=jlpt',
    );
    expect(routes.legal('en', 'refund')).toBe('/en/legal/refund/');
  });
  it('strips and switches locales', () => {
    expect(stripLocale('/ar/courses/kanji/')).toBe('/courses/kanji/');
    expect(stripLocale('/en/')).toBe('/');
    expect(switchLocalePath('/en/pricing/', 'ar')).toBe('/ar/pricing/');
    expect(switchLocalePath('/ar/courses', 'en', '?level=n5')).toBe('/en/courses/?level=n5');
  });
  it('detects the active nav item', () => {
    expect(isActivePath('/en/courses/kanji/', '/en/courses/')).toBe(true);
    expect(isActivePath('/en/courses/', '/en/')).toBe(false);
    expect(isActivePath('/en/', '/en/')).toBe(true);
  });
});

const card = (over: Partial<CourseCardData>): CourseCardData => ({
  slug: 'x',
  href: '/en/courses/x/',
  title: 'Title',
  description: 'Description',
  image: '/x.svg',
  glyph: '字',
  levels: ['n5'],
  categories: ['kanji'],
  levelLabel: 'N5',
  categoryLabel: 'Kanji',
  ...over,
});

describe('catalog filter', () => {
  const courses = [
    card({ slug: 'kanji', title: 'Kanji', levels: ['n5', 'n4', 'n3', 'n2', 'n1'], categories: ['kanji'] }),
    card({
      slug: 'travel',
      title: 'Japanese for Travel',
      levels: ['beginner', 'n5'],
      categories: ['travel', 'conversation'],
    }),
    card({
      slug: 'ar',
      title: 'الهيراغانا والكاتاكانا',
      levels: ['beginner'],
      categories: ['hiragana-katakana'],
    }),
  ];
  it('filters by level and category', () => {
    expect(filterCourses(courses, { q: '', level: 'n1', category: '' }).map((c) => c.slug)).toEqual([
      'kanji',
    ]);
    expect(filterCourses(courses, { q: '', level: '', category: 'conversation' }).map((c) => c.slug)).toEqual(
      ['travel'],
    );
    expect(filterCourses(courses, { q: '', level: 'beginner', category: 'kanji' })).toHaveLength(0);
  });
  it('searches case- and diacritic-insensitively, including Arabic', () => {
    expect(filterCourses(courses, { q: 'TRAVEL', level: '', category: '' }).map((c) => c.slug)).toEqual([
      'travel',
    ]);
    expect(filterCourses(courses, { q: 'الهيراغانا', level: '', category: '' }).map((c) => c.slug)).toEqual([
      'ar',
    ]);
    expect(normalizeSearch('Ryokō')).toBe('ryoko');
    expect(normalizeSearch('أَهلاً')).toBe('اهلا');
  });
  it('round-trips URL params and ignores invalid values', () => {
    expect(parseFilters('?level=n3&category=work&q=keigo')).toEqual({
      q: 'keigo',
      level: 'n3',
      category: 'work',
    });
    expect(parseFilters('?level=n9&category=<script>')).toEqual({ q: '', level: '', category: '' });
    expect(serializeFilters({ q: ' kanji ', level: 'n5', category: '' })).toBe('?q=kanji&level=n5');
    expect(serializeFilters({ q: '', level: '', category: '' })).toBe('');
  });
  it('labels level ranges in curriculum order', () => {
    expect(levelRangeLabel(['n1', 'n5', 'n3'], en.levels)).toBe('N5 – N1');
    expect(levelRangeLabel(['beginner'], en.levels)).toBe('Beginner');
    expect(levelRangeLabel(['n5', 'beginner'], en.levels)).toBe('Beginner – N5');
  });
});

describe('pricing', () => {
  it('never invents a price', () => {
    expect(formatPrice({ price: null, currency: 'USD' }, 'en')).toBe(PRICE_PLACEHOLDER.en);
    expect(formatPrice({ price: null, currency: 'USD' }, 'ar')).toBe('XX$');
  });
  it('formats real prices with Latin digits', () => {
    expect(formatPrice({ price: 19, currency: 'USD' }, 'en')).toBe('$19');
    expect(formatPrice({ price: 19.5, currency: 'USD' }, 'en')).toBe('$19.50');
    expect(formatPrice({ price: 19, currency: 'USD' }, 'ar')).toMatch(/19/);
  });
});

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

describe('route guard', () => {
  const session = (roles: Session['user']['roles'], expiresAt = '2999-01-01T00:00:00Z'): Session => ({
    id: 's',
    userId: 'u',
    expiresAt,
    user: {
      id: 'u',
      email: 'a@b.c',
      fullName: 'A',
      roles,
      preferredLanguage: 'en',
      japaneseLevel: 'n5',
      emailVerified: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  });
  it('redirects anonymous users to login', () => {
    expect(guardRoute(null, AREA_ROLES.student, 'ar')).toEqual({
      allowed: false,
      reason: 'unauthenticated',
      redirectTo: '/ar/login/',
    });
  });
  it('enforces roles and expiry', () => {
    expect(guardRoute(session(['student']), AREA_ROLES.teacher, 'en').allowed).toBe(false);
    expect(guardRoute(session(['teacher']), AREA_ROLES.teacher, 'en').allowed).toBe(true);
    expect(guardRoute(session(['admin']), AREA_ROLES.student, 'en').allowed).toBe(true);
    expect(guardRoute(session(['admin'], '2000-01-01T00:00:00Z'), AREA_ROLES.admin, 'en')).toMatchObject({
      allowed: false,
      reason: 'expired',
    });
  });
});

describe('auth service (V1)', () => {
  it('reports "not available" on 501 instead of faking a session', async () => {
    const fetch501 = vi.fn().mockResolvedValue(new Response('{}', { status: 501 }));
    const service = new HttpAuthService('/api/auth', fetch501);
    await expect(service.login({ email: 'a@b.c', password: 'x' })).rejects.toBeInstanceOf(
      AuthNotAvailableError,
    );
    expect(await service.getSession()).toBeNull();
  });
});

describe('payment adapters (V1)', () => {
  it('never simulates a payment', async () => {
    const provider = new NotImplementedPaymentProvider();
    await expect(provider.getSubscriptionStatus('cs_123')).rejects.toBeInstanceOf(PaymentsNotAvailableError);
  });
  it('only uses configured https checkout links', async () => {
    const provider = new ExternalLinkPaymentProvider({
      basic: 'https://pay.example.com/b',
      premium: 'javascript:alert(1)',
    });
    expect(provider.linkFor('basic')).toBe('https://pay.example.com/b');
    expect(provider.linkFor('premium')).toBeUndefined();
    expect(provider.linkFor('private')).toBeUndefined();
    await expect(
      provider.createCheckoutSession({ plan: 'private', locale: 'en', successUrl: '', cancelUrl: '' }),
    ).rejects.toBeInstanceOf(PaymentsNotAvailableError);
  });
});
