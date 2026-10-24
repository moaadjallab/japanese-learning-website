/**
 * Video copy, taken from the website's own content so the promo never drifts from the site:
 * UI dictionaries (src/i18n), courses and plans (src/content), brand (src/config/site.ts).
 */
import { en } from '../../src/i18n/en';
import { ar } from '../../src/i18n/ar';
import { site } from '../../src/config/site';
import courses from '../../src/content/courses.json';
import plans from '../../src/content/plans.json';

export type Lang = 'en' | 'ar';

// Courses shown in the course scene (by slug), in display order.
const FEATURED = ['beginner-japanese', 'japanese-n5', 'japanese-conversation', 'japanese-for-travel', 'japanese-for-work', 'kanji'];

export const getCopy = (lang: Lang) => {
  const d = lang === 'ar' ? ar : en;
  return {
    lang,
    dir: lang === 'ar' ? ('rtl' as const) : ('ltr' as const),
    brand: site.name[lang],
    tagline: site.tagline[lang],
    heroTitle: d.home.hero.title,
    heroSubtitle: d.home.hero.subtitle,
    levelsHeading: d.home.hero.highlights[0] ?? '',
    levels: (['beginner', 'n5', 'n4', 'n3', 'n2', 'n1'] as const).map((id) => d.levels[id]),
    coursesHeading: d.home.courses.title,
    courses: FEATURED.map((slug) => {
      const c = courses.find((x) => x.id === slug)!;
      return { glyph: c.glyph, title: c.title[lang] };
    }),
    featuresHeading: d.home.features.title,
    features: d.home.features.items.map((f) => f.title),
    plansHeading: d.home.pricing.title,
    plans: plans.map((p) => ({
      name: p.name[lang],
      highlighted: p.highlighted,
      // First two distinctive features (skip "Everything in …").
      features: p.features[lang].filter((_, i) => p.id === 'basic' || i > 0).slice(0, 2),
    })),
    mostPopular: d.common.mostPopular,
    ctaTitle: d.home.finalCta.title,
    ctaSubtitle: d.home.finalCta.subtitle,
    cta: d.common.startLearning,
  };
};

export type Copy = ReturnType<typeof getCopy>;
