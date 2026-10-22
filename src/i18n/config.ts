/** Locale configuration shared by routing, components and tests (no Astro imports here). */
export const LOCALES = ['en', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_META: Record<
  Locale,
  { dir: 'ltr' | 'rtl'; htmlLang: string; ogLocale: string; label: string; intl: string }
> = {
  en: { dir: 'ltr', htmlLang: 'en', ogLocale: 'en_US', label: 'English', intl: 'en-US' },
  ar: { dir: 'rtl', htmlLang: 'ar', ogLocale: 'ar_AR', label: 'العربية', intl: 'ar' },
};

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (LOCALES as readonly string[]).includes(value);

export const getDir = (locale: Locale) => LOCALE_META[locale].dir;

/** For Astro getStaticPaths in src/pages/[lang]/... */
export const localeStaticPaths = () => LOCALES.map((lang) => ({ params: { lang } }));
