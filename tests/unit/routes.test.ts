import { describe, expect, it } from 'vitest';
import { isActivePath, routes, stripLocale, switchLocalePath } from '@/lib/routes';

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
