import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/en';
import { ar } from '@/i18n/ar';
import { getDictionary, interpolate, negotiateLocale, plural, resolveLocale, t } from '@/i18n';

/** Collect "a.b.c" paths for every leaf (strings and array items) of a dictionary. */
const leafPaths = (node: unknown, prefix = ''): string[] => {
  if (typeof node === 'string') return [prefix];
  if (Array.isArray(node)) return node.flatMap((item, i) => leafPaths(item, `${prefix}[${i}]`));
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [];
};

const leafValues = (node: unknown): string[] =>
  typeof node === 'string'
    ? [node]
    : Array.isArray(node)
      ? node.flatMap(leafValues)
      : node && typeof node === 'object'
        ? Object.values(node).flatMap(leafValues)
        : [];

describe('dictionaries', () => {
  it('Arabic and English have exactly the same keys (including array lengths)', () => {
    expect(leafPaths(ar).sort()).toEqual(leafPaths(en).sort());
  });

  it('has no empty strings', () => {
    for (const value of [...leafValues(en), ...leafValues(ar)]) expect(value.trim()).not.toBe('');
  });

  it('uses the exact SPEC copy for key headlines', () => {
    expect(en.home.hero.title).toBe('Learn Japanese Online');
    expect(ar.home.hero.title).toBe('تعلّم اللغة اليابانية عبر الإنترنت');
    expect(ar.home.hero.subtitle).toBe(
      'تعلّم اللغة اليابانية من المستوى المبتدئ إلى المتقدم من خلال دورات منظمة وحصص مباشرة.',
    );
    expect(en.home.finalCta.title).toBe('Ready to Start Learning Japanese?');
    expect(ar.home.finalCta.title).toBe('هل أنت مستعد لبدء تعلم اللغة اليابانية؟');
    expect(en.success.title).toBe('Welcome to our Japanese learning community! 🎉');
  });

  it('keeps interpolation tokens consistent between locales', () => {
    const tokens = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(',');
    const enPaths = leafPaths(en);
    const get = (obj: unknown, path: string) =>
      path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], obj) as string;
    for (const path of enPaths) expect(tokens(get(ar, path)), path).toBe(tokens(get(en, path)));
  });
});

describe('t()', () => {
  it('translates by key', () => {
    expect(t('en', 'nav.home')).toBe('Home');
    expect(t('ar', 'nav.home')).toBe('الرئيسية');
  });
  it('interpolates parameters', () => {
    expect(t('en', 'footer.rights', { year: 2030, brand: 'X' })).toBe('© 2030 X. All rights reserved.');
  });
  it('leaves unknown tokens visible', () => {
    expect(interpolate('Hello {name} {missing}', { name: 'Aya' })).toBe('Hello Aya {missing}');
  });
});

describe('plural()', () => {
  const en5 = getDictionary('en').coursesPage.resultCount;
  const ar5 = getDictionary('ar').coursesPage.resultCount;
  it('handles English', () => {
    expect(plural('en', en5, 1)).toBe('1 course');
    expect(plural('en', en5, 14)).toBe('14 courses');
  });
  it('handles Arabic plural categories', () => {
    expect(plural('ar', ar5, 0)).toBe('لا توجد دورات');
    expect(plural('ar', ar5, 1)).toBe('دورة واحدة');
    expect(plural('ar', ar5, 2)).toBe('دورتان');
    expect(plural('ar', ar5, 5)).toBe('5 دورات');
    expect(plural('ar', ar5, 14)).toBe('14 دورة');
  });
});

describe('negotiateLocale()', () => {
  it.each([
    [null, 'en'],
    ['', 'en'],
    ['ar-MA,ar;q=0.9,fr;q=0.8', 'ar'],
    ['fr-FR,fr;q=0.9,en;q=0.8,ar;q=0.7', 'en'],
    ['fr-FR,ar;q=0.8,en;q=0.5', 'ar'],
    ['de-DE', 'en'],
    ['en-US,en;q=0.9', 'en'],
    ['ar;q=0', 'en'],
  ])('%s → %s', (header, expected) => {
    expect(negotiateLocale(header)).toBe(expected);
  });
});

describe('resolveLocale()', () => {
  it('falls back to English for invalid values', () => {
    expect(resolveLocale('ar')).toBe('ar');
    expect(resolveLocale('fr')).toBe('en');
    expect(resolveLocale(undefined)).toBe('en');
  });
});
