/**
 * Translation helpers. All UI strings live in ./en.ts and ./ar.ts.
 *
 *   const t = useTranslations(lang);
 *   t('nav.home')                 // "Home"
 *   plural(lang, getDictionary(lang).coursesPage.resultCount, 3)  // "3 courses"
 *   getDictionary(lang).home.features.items  // for arrays / structured copy
 */
import { en } from './en';
import { ar } from './ar';
import { DEFAULT_LOCALE, isLocale, type Locale } from './config';
import type { Dictionary } from './types';

export * from './config';
export type { Dictionary } from './types';

const dictionaries: Record<Locale, Dictionary> = { en, ar };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];

/** Dot-separated paths to every string leaf of the dictionary. */
type StringPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : T[K] extends readonly unknown[]
      ? never
      : T[K] extends object
        ? StringPaths<T[K], `${Prefix}${K}.`>
        : never;
}[keyof T & string];

export type TranslationKey = StringPaths<Dictionary>;
export type TranslationParams = Record<string, string | number>;

/** Replace `{name}` tokens. Unknown tokens are left untouched so they are easy to spot. */
export const interpolate = (template: string, params?: TranslationParams): string =>
  params
    ? template.replace(/\{(\w+)\}/g, (match, key: string) => (key in params ? String(params[key]) : match))
    : template;

const lookup = (dict: unknown, key: string): string | undefined => {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in node) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof node === 'string' ? node : undefined;
};

/**
 * Translate a key. Falls back to the default locale, then to the key itself
 * (so a missing translation is visible instead of rendering an empty string).
 */
export const t = (locale: Locale, key: TranslationKey, params?: TranslationParams): string => {
  const value = lookup(dictionaries[locale], key) ?? lookup(dictionaries[DEFAULT_LOCALE], key) ?? key;
  return interpolate(value, params);
};

export const useTranslations =
  (locale: Locale) =>
  (key: TranslationKey, params?: TranslationParams): string =>
    t(locale, key, params);

/** Resolve a locale from an untrusted route param, defaulting safely. */
export const resolveLocale = (value: unknown): Locale => (isLocale(value) ? value : DEFAULT_LOCALE);

/** Pick the localized value from a `{ en, ar }` content object. */
export const localized = <T>(value: Record<Locale, T>, locale: Locale): T => value[locale];

/**
 * Pick the best locale from an Accept-Language header (used by the root redirect).
 * Honors q-values; any "ar-*" variant maps to "ar".
 */
export const negotiateLocale = (header: string | null | undefined): Locale => {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag = '', ...rest] = part.trim().split(';');
      const q = rest.find((p) => p.trim().startsWith('q='));
      const quality = q ? Number.parseFloat(q.trim().slice(2)) : 1;
      return { base: tag.toLowerCase().split('-')[0] ?? '', quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.base && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  const match = ranked.find((entry) => isLocale(entry.base));
  return match && isLocale(match.base) ? match.base : DEFAULT_LOCALE;
};

export type PluralForms = Readonly<Record<Intl.LDMLPluralRule, string>>;

/** Choose the correct plural form (Arabic has zero/one/two/few/many/other). */
export const plural = (locale: Locale, forms: PluralForms, count: number): string => {
  const rule = new Intl.PluralRules(locale).select(count);
  return interpolate(forms[rule] ?? forms.other, { count });
};
