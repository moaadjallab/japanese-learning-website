/**
 * Content collections (Astro content layer). Data is typed and validated at build time.
 * Components never read these directly — use src/lib/repositories/* so the storage can
 * later move to Cloudflare D1 without touching UI code.
 */
import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import {
  CATEGORY_IDS,
  COMPARISON_KEYS,
  FAQ_CATEGORY_IDS,
  LESSON_TYPES,
  LEVEL_IDS,
  PLAN_IDS,
} from '@/lib/domain/types';

const localized = <T extends z.ZodTypeAny>(schema: T) => z.object({ en: schema, ar: schema });

const courses = defineCollection({
  loader: file('src/content/courses.json'),
  schema: z.object({
    order: z.number().int(),
    levels: z.array(z.enum(LEVEL_IDS)).min(1),
    categories: z.array(z.enum(CATEGORY_IDS)).min(1),
    glyph: z.string(),
    glyphReading: z.string().optional(),
    image: z.string().startsWith('/'),
    plans: z.array(z.enum(PLAN_IDS)).min(1),
    title: localized(z.string()),
    description: localized(z.string()),
    overview: localized(z.string()),
    outcomes: localized(z.array(z.string())),
    example: z.object({ ja: z.string(), romaji: z.string(), meaning: localized(z.string()) }),
  }),
});

const plans = defineCollection({
  loader: file('src/content/plans.json'),
  schema: z.object({
    order: z.number().int(),
    highlighted: z.boolean(),
    /** Monthly price in major units (e.g. 19). `null` = not decided yet → shows "$XX". */
    price: z.number().positive().nullable(),
    currency: z.string().length(3),
    interval: z.literal('month'),
    name: localized(z.string()),
    description: localized(z.string()),
    features: localized(z.array(z.string())),
    comparison: z.object(
      Object.fromEntries(COMPARISON_KEYS.map((k) => [k, z.boolean()])) as Record<
        (typeof COMPARISON_KEYS)[number],
        z.ZodBoolean
      >,
    ),
  }),
});

const faqs = defineCollection({
  loader: file('src/content/faqs.json'),
  schema: z.object({
    category: z.enum(FAQ_CATEGORY_IDS),
    order: z.number().int(),
    /** Position in the home-page preview; omitted = not shown on home. */
    homeOrder: z.number().int().optional(),
    /** Dev-only marker label when the answer still needs business confirmation. */
    placeholder: z.string().optional(),
    question: localized(z.string()),
    homeQuestion: localized(z.string()).optional(),
    answer: localized(z.string()),
  }),
});

const testimonials = defineCollection({
  loader: file('src/content/testimonials.json'),
  schema: z.object({
    order: z.number().int(),
    /** true = render the localized "Student testimonial goes here." placeholder. */
    placeholder: z.boolean(),
    quote: localized(z.string()).nullable(),
    name: z.string().nullable(),
    country: localized(z.string()).nullable(),
    course: z.string().optional(),
  }),
});

const lessons = defineCollection({
  loader: file('src/content/lessons.json'),
  schema: z.object({
    /** Course slug from courses.json. */
    course: z.string(),
    order: z.number().int(),
    type: z.enum(LESSON_TYPES),
    durationMin: z.number().int().positive(),
    /** Embeddable https video URL (YouTube/Vimeo/Cloudflare Stream). null = not recorded yet. */
    videoUrl: z.string().url().startsWith('https://').nullable(),
    title: localized(z.string()),
    summary: localized(z.string()),
    /** Key vocabulary / characters shown on the lesson page. */
    items: z.array(z.object({ ja: z.string(), romaji: z.string(), meaning: localized(z.string()) })),
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    updated: z.coerce.date(),
  }),
});

export const collections = { courses, lessons, plans, faqs, testimonials, legal };
