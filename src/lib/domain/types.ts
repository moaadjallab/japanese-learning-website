/**
 * Domain types shared by repositories, components, islands and tests.
 * Pure TypeScript — no Astro imports — so it can run anywhere (browser, Worker, Vitest).
 */
import type { Locale } from '@/i18n/config';

export const LEVEL_IDS = ['beginner', 'n5', 'n4', 'n3', 'n2', 'n1'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];

export const CATEGORY_IDS = [
  'jlpt',
  'conversation',
  'travel',
  'work',
  'grammar',
  'kanji',
  'vocabulary',
  'hiragana-katakana',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export const PLAN_IDS = ['basic', 'premium', 'private'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const COMPARISON_KEYS = [
  'recordedCourses',
  'pdfMaterials',
  'exercises',
  'quizzes',
  'liveClasses',
  'conversationPractice',
  'teacherSupport',
  'privateLessons',
  'personalizedLearning',
] as const;
export type ComparisonKey = (typeof COMPARISON_KEYS)[number];

export const FAQ_CATEGORY_IDS = ['courses', 'subscriptions', 'classes', 'payments'] as const;
export type FaqCategoryId = (typeof FAQ_CATEGORY_IDS)[number];

export type Localized<T> = Record<Locale, T>;

export interface Course {
  slug: string;
  order: number;
  levels: LevelId[];
  categories: CategoryId[];
  glyph: string;
  glyphReading?: string;
  image: string;
  plans: PlanId[];
  title: Localized<string>;
  description: Localized<string>;
  overview: Localized<string>;
  outcomes: Localized<string[]>;
  example: { ja: string; romaji: string; meaning: Localized<string> };
}

/** Flattened, single-locale course used by the client-side catalog island. */
export interface CourseCardData {
  slug: string;
  href: string;
  title: string;
  description: string;
  image: string;
  glyph: string;
  levels: LevelId[];
  categories: CategoryId[];
  levelLabel: string;
  categoryLabel: string;
}

export interface Plan {
  id: PlanId;
  order: number;
  highlighted: boolean;
  price: number | null;
  currency: string;
  interval: 'month';
  name: Localized<string>;
  description: Localized<string>;
  features: Localized<string[]>;
  comparison: Record<ComparisonKey, boolean>;
}

export interface Faq {
  id: string;
  category: FaqCategoryId;
  order: number;
  homeOrder?: number;
  placeholder?: string;
  question: Localized<string>;
  homeQuestion?: Localized<string>;
  answer: Localized<string>;
}

export interface Testimonial {
  id: string;
  order: number;
  placeholder: boolean;
  quote: Localized<string> | null;
  name: string | null;
  country: Localized<string> | null;
  course?: string;
}

export const isPlanId = (value: unknown): value is PlanId =>
  typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
export const isLevelId = (value: unknown): value is LevelId =>
  typeof value === 'string' && (LEVEL_IDS as readonly string[]).includes(value);
export const isCategoryId = (value: unknown): value is CategoryId =>
  typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
