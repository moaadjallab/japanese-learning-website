/**
 * JSON-LD builders. Deliberately NO Review / AggregateRating / offers with invented
 * prices — only facts we can stand behind.
 */
import { site } from '@/config/site';
import type { Locale } from '@/i18n/config';
import type { Course, Faq } from '@/lib/domain/types';

type Json = Record<string, unknown>;

const abs = (path: string, siteUrl: URL | string) => new URL(path, siteUrl).href;

export const organizationLd = (lang: Locale, siteUrl: URL | string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  '@id': abs('/#organization', siteUrl),
  name: site.name[lang],
  alternateName: site.name[lang === 'en' ? 'ar' : 'en'],
  url: abs(`/${lang}/`, siteUrl),
  logo: abs(site.logo, siteUrl),
  description: site.tagline[lang],
  email: site.contact.email,
  sameAs: [site.contact.instagramUrl],
});

export const websiteLd = (lang: Locale, siteUrl: URL | string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': abs(`/${lang}/#website`, siteUrl),
  name: site.name[lang],
  url: abs(`/${lang}/`, siteUrl),
  inLanguage: lang,
  publisher: { '@id': abs('/#organization', siteUrl) },
});

export const courseLd = (course: Course, lang: Locale, siteUrl: URL | string, levelLabel: string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Course',
  name: course.title[lang],
  description: course.description[lang],
  url: abs(`/${lang}/courses/${course.slug}/`, siteUrl),
  inLanguage: lang,
  educationalLevel: levelLabel,
  about: { '@type': 'Thing', name: 'Japanese language' },
  teaches: course.outcomes[lang],
  image: abs(course.image, siteUrl),
  provider: {
    '@type': 'EducationalOrganization',
    name: site.name[lang],
    sameAs: abs(`/${lang}/`, siteUrl),
  },
  hasCourseInstance: {
    '@type': 'CourseInstance',
    courseMode: 'online',
    courseWorkload: 'P1M',
  },
});

export const faqPageLd = (faqs: Faq[], lang: Locale): Json => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  inLanguage: lang,
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question[lang],
    acceptedAnswer: { '@type': 'Answer', text: faq.answer[lang] },
  })),
});

export const breadcrumbLd = (items: { name: string; path: string }[], siteUrl: URL | string): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: abs(item.path, siteUrl),
  })),
});
