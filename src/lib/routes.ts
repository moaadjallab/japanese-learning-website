/**
 * Central URL builder. Never hand-write localized URLs in components.
 * All paths end with a trailing slash (matches the build output and canonical URLs).
 */
import { LOCALES, isLocale, type Locale } from '@/i18n/config';
import type { PlanId } from '@/lib/domain/types';

export type LegalDoc = 'terms' | 'privacy' | 'refund' | 'cookies';

const withLocale = (lang: Locale, path: string) => `/${lang}${path === '/' ? '/' : path}`;

export const routes = {
  home: (lang: Locale) => withLocale(lang, '/'),
  courses: (lang: Locale, query?: { level?: string; category?: string; q?: string }) => {
    const params = new URLSearchParams();
    if (query?.q) params.set('q', query.q);
    if (query?.level) params.set('level', query.level);
    if (query?.category) params.set('category', query.category);
    const qs = params.toString();
    return withLocale(lang, '/courses/') + (qs ? `?${qs}` : '');
  },
  course: (lang: Locale, slug: string) => withLocale(lang, `/courses/${slug}/`),
  pricing: (lang: Locale, hash?: string) => withLocale(lang, '/pricing/') + (hash ? `#${hash}` : ''),
  about: (lang: Locale) => withLocale(lang, '/about/'),
  faq: (lang: Locale) => withLocale(lang, '/faq/'),
  contact: (lang: Locale) => withLocale(lang, '/contact/'),
  login: (lang: Locale) => withLocale(lang, '/login/'),
  register: (lang: Locale) => withLocale(lang, '/register/'),
  forgotPassword: (lang: Locale) => withLocale(lang, '/forgot-password/'),
  resetPassword: (lang: Locale) => withLocale(lang, '/reset-password/'),
  verifyEmail: (lang: Locale) => withLocale(lang, '/verify-email/'),
  /** Signed-in account page (on demand). */
  account: (lang: Locale) => withLocale(lang, '/account/'),
  checkout: (lang: Locale, plan?: PlanId) => withLocale(lang, '/checkout/') + (plan ? `?plan=${plan}` : ''),
  checkoutSuccess: (lang: Locale) => withLocale(lang, '/checkout/success/'),
  legal: (lang: Locale, doc: LegalDoc) => withLocale(lang, `/legal/${doc}/`),
  /** Student space (on demand, signed-in users). */
  dashboard: (lang: Locale) => withLocale(lang, '/dashboard/'),
  dashboardCourses: (lang: Locale) => withLocale(lang, '/dashboard/courses/'),
  dashboardCourse: (lang: Locale, course: string) => withLocale(lang, `/dashboard/courses/${course}/`),
  dashboardLesson: (lang: Locale, course: string, lesson: string) =>
    withLocale(lang, `/dashboard/courses/${course}/${lesson}/`),
  dashboardLive: (lang: Locale) => withLocale(lang, '/dashboard/live/'),
  /** Minimal administration (admin role). */
  admin: (lang: Locale) => withLocale(lang, '/admin/'),
} as const;

/** Strip the locale prefix: "/ar/courses/kanji/" → "/courses/kanji/". */
export const stripLocale = (pathname: string): string => {
  const [, first, ...rest] = pathname.split('/');
  if (isLocale(first)) {
    const remainder = `/${rest.join('/')}`;
    return remainder === '/' || remainder === '' ? '/' : remainder;
  }
  return pathname || '/';
};

/** Same page in another locale: "/en/pricing/" → "/ar/pricing/". Keeps query/hash if given. */
export const switchLocalePath = (pathname: string, to: Locale, search = ''): string => {
  const base = stripLocale(pathname);
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `/${to}${normalized}${search}`;
};

/** Locale-agnostic path → absolute URL map for hreflang alternates. */
export const alternateUrls = (path: string, site: URL | string) =>
  Object.fromEntries(LOCALES.map((l) => [l, new URL(`/${l}${path}`, site).href])) as Record<Locale, string>;

/** Is this nav target the current page (or a parent of it)? */
export const isActivePath = (current: string, target: string): boolean => {
  const a = stripLocale(current);
  const b = stripLocale(target);
  return b === '/' ? a === '/' : a.startsWith(b);
};
