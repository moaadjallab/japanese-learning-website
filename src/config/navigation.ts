import type { Locale } from '@/i18n/config';
import { routes, type LegalDoc } from '@/lib/routes';

/** Header & footer navigation (SPEC: Home, Courses, Pricing, About, FAQ, Contact). */
export const mainNav = [
  { key: 'home', href: routes.home },
  { key: 'courses', href: routes.courses },
  { key: 'pricing', href: routes.pricing },
  { key: 'about', href: routes.about },
  { key: 'faq', href: routes.faq },
  { key: 'contact', href: routes.contact },
] as const satisfies readonly { key: string; href: (lang: Locale) => string }[];

export const legalNav: readonly LegalDoc[] = ['terms', 'privacy', 'refund', 'cookies'];
