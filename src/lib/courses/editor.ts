/**
 * Course editor rules (pure, unit-tested in tests/unit/course-editor.test.ts):
 * - the course content schema (mirrors the `courses` collection in src/content.config.ts),
 * - parsing the admin form into course content,
 * - merging admin changes (D1 `course_overrides`) over the built-in courses.json.
 */
import { z } from 'zod';
import { CATEGORY_IDS, LEVEL_IDS, PLAN_IDS, type Course } from '@/lib/domain/types';

const text = (max: number) => z.string().trim().min(1).max(max);
const localized = <T extends z.ZodTypeAny>(schema: T) => z.object({ en: schema, ar: schema });

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const slugSchema = z.string().trim().min(2).max(60).regex(SLUG_PATTERN);

/** Course content without its slug (what is stored in course_overrides.data). */
export const courseDataSchema = z.object({
  order: z.number().int().min(0).max(9999),
  levels: z.array(z.enum(LEVEL_IDS)).min(1),
  categories: z.array(z.enum(CATEGORY_IDS)).min(1),
  glyph: text(8),
  glyphReading: z.string().trim().max(80).optional(),
  // Site-relative image path only (no external hosts: CSP img-src is 'self').
  image: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9/_.-]+$/),
  plans: z.array(z.enum(PLAN_IDS)).min(1),
  title: localized(text(120)),
  description: localized(text(300)),
  overview: localized(text(2000)),
  outcomes: localized(z.array(text(200)).min(1).max(12)),
  example: z.object({ ja: text(60), romaji: text(80), meaning: localized(text(120)) }),
});
export type CourseData = z.infer<typeof courseDataSchema>;

export const DEFAULT_COURSE_IMAGE = '/images/placeholders/courses/beginner-japanese.svg';

const lines = (value: unknown) =>
  String(value ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const str = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/** Admin form (FormData) → course content, validated. Outcomes are one per line. */
export const parseCourseForm = (form: FormData) => {
  const glyphReading = str(form, 'glyphReading').trim();
  return courseDataSchema.safeParse({
    order: Number(str(form, 'order') || 0),
    levels: form.getAll('levels'),
    categories: form.getAll('categories'),
    glyph: str(form, 'glyph'),
    ...(glyphReading ? { glyphReading } : {}),
    image: str(form, 'image') || DEFAULT_COURSE_IMAGE,
    plans: form.getAll('plans'),
    title: { en: str(form, 'titleEn'), ar: str(form, 'titleAr') },
    description: { en: str(form, 'descriptionEn'), ar: str(form, 'descriptionAr') },
    overview: { en: str(form, 'overviewEn'), ar: str(form, 'overviewAr') },
    outcomes: { en: lines(form.get('outcomesEn')), ar: lines(form.get('outcomesAr')) },
    example: {
      ja: str(form, 'exampleJa'),
      romaji: str(form, 'exampleRomaji'),
      meaning: { en: str(form, 'exampleMeaningEn'), ar: str(form, 'exampleMeaningAr') },
    },
  });
};

/* ------------------------------------------------------------------- merging */

export interface CourseOverrideRow {
  id: string;
  data: string | null;
  hidden: number;
  deleted: number;
  updated_at?: string;
}

export type CourseSource = 'builtin' | 'custom';

/** A course as the admin sees it: content plus where it comes from and its state. */
export interface AdminCourse extends Course {
  source: CourseSource;
  modified: boolean;
  hidden: boolean;
  deleted: boolean;
  updatedAt: string | null;
}

const parseData = (json: string | null): CourseData | null => {
  if (!json) return null;
  try {
    const parsed = courseDataSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

/** Every course (built-in and created, hidden and deleted included), sorted by order then slug. */
export const mergeCourses = (base: readonly Course[], rows: readonly CourseOverrideRow[]): AdminCourse[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result: AdminCourse[] = base.map((course) => {
    const row = byId.get(course.slug);
    const data = parseData(row?.data ?? null);
    return {
      ...course,
      ...(data ?? {}),
      slug: course.slug,
      source: 'builtin',
      modified: Boolean(data),
      hidden: row?.hidden === 1,
      deleted: row?.deleted === 1,
      updatedAt: row?.updated_at ?? null,
    };
  });
  const builtin = new Set(base.map((course) => course.slug));
  for (const row of rows) {
    if (builtin.has(row.id)) continue;
    const data = parseData(row.data);
    if (!data) continue;
    result.push({
      ...data,
      slug: row.id,
      source: 'custom',
      modified: false,
      hidden: row.hidden === 1,
      deleted: false,
      updatedAt: row.updated_at ?? null,
    });
  }
  return result.sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
};

/** Plain course content (drops the admin-only fields). */
export const toPublicCourse = ({
  source: _source,
  modified: _modified,
  hidden: _hidden,
  deleted: _deleted,
  updatedAt: _updatedAt,
  ...course
}: AdminCourse): Course => course;

/** What visitors and students see: not hidden, not deleted. */
export const visibleCourses = (all: readonly AdminCourse[]): Course[] =>
  all.filter((course) => !course.hidden && !course.deleted).map(toPublicCourse);
