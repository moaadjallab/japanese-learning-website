/**
 * Lesson editor rules (pure, unit-tested in tests/unit/lesson-editor.test.ts):
 * - the lesson content schema (mirrors the `lessons` collection in src/content.config.ts),
 * - parsing the admin form (video link and vocabulary formats live in ./lesson-format.ts),
 * - merging admin changes (D1 `lesson_overrides`) over the built-in lessons.json.
 */
import { z } from 'zod';
import { LESSON_TYPES, type Lesson } from '@/lib/domain/types';
import { slugSchema } from './editor';
import { normalizeVideoUrl, parseItems } from './lesson-format';

export { formatItems, normalizeVideoUrl, parseItems } from './lesson-format';

const text = (max: number) => z.string().trim().min(1).max(max);
const localized = <T extends z.ZodTypeAny>(schema: T) => z.object({ en: schema, ar: schema });

export const lessonSlugSchema = slugSchema;

const itemSchema = z.object({ ja: text(80), romaji: text(120), meaning: localized(text(200)) });

/** Lesson content without id/slug/course (what is stored in lesson_overrides.data). */
export const lessonDataSchema = z.object({
  order: z.number().int().min(0).max(9999),
  type: z.enum(LESSON_TYPES),
  durationMin: z.number().int().min(1).max(600),
  videoUrl: z
    .string()
    .url()
    .nullable()
    .refine((v) => v === null || normalizeVideoUrl(v) === v, 'unsupported video link'),
  title: localized(text(150)),
  summary: localized(text(3000)),
  items: z.array(itemSchema).max(80),
});
export type LessonData = z.infer<typeof lessonDataSchema>;
export type LessonItem = z.infer<typeof itemSchema>;

const str = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/** Admin form (FormData) → lesson content, validated. */
export const parseLessonForm = (form: FormData) => {
  const { items, badLines } = parseItems(str(form, 'items'));
  const rawVideo = str(form, 'videoUrl').trim();
  const videoUrl = rawVideo ? normalizeVideoUrl(rawVideo) : null;
  if (badLines.length || (rawVideo && !videoUrl)) {
    return { success: false as const, badLines, badVideo: Boolean(rawVideo && !videoUrl) };
  }
  const parsed = lessonDataSchema.safeParse({
    order: Number(str(form, 'order') || 0),
    type: str(form, 'type'),
    durationMin: Number(str(form, 'durationMin') || 0),
    videoUrl,
    title: { en: str(form, 'titleEn'), ar: str(form, 'titleAr') },
    summary: { en: str(form, 'summaryEn'), ar: str(form, 'summaryAr') },
    items,
  });
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const, badLines: [], badVideo: false };
};

/* ------------------------------------------------------------------- merging */

export interface LessonOverrideRow {
  id: string;
  course_id: string;
  data: string | null;
  hidden: number;
  deleted: number;
  updated_at?: string;
}

export interface AdminLesson extends Lesson {
  source: 'builtin' | 'custom';
  modified: boolean;
  hidden: boolean;
  deleted: boolean;
}

const parseData = (json: string | null): LessonData | null => {
  if (!json) return null;
  try {
    const parsed = lessonDataSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};

export const lessonId = (course: string, slug: string) => `${course}/${slug}`;

/** Every lesson (built-in and created, hidden and deleted included), by course then order. */
export const mergeLessons = (base: readonly Lesson[], rows: readonly LessonOverrideRow[]): AdminLesson[] => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const result: AdminLesson[] = base.map((lesson) => {
    const row = byId.get(lesson.id);
    const data = parseData(row?.data ?? null);
    return {
      ...lesson,
      ...(data ?? {}),
      id: lesson.id,
      slug: lesson.slug,
      course: lesson.course,
      source: 'builtin',
      modified: Boolean(data),
      hidden: row?.hidden === 1,
      deleted: row?.deleted === 1,
    };
  });
  const builtin = new Set(base.map((lesson) => lesson.id));
  for (const row of rows) {
    if (builtin.has(row.id)) continue;
    const data = parseData(row.data);
    const slug = row.id.slice(row.course_id.length + 1);
    if (!data || row.id !== lessonId(row.course_id, slug) || !slug) continue;
    result.push({
      ...data,
      id: row.id,
      slug,
      course: row.course_id,
      source: 'custom',
      modified: false,
      hidden: row.hidden === 1,
      deleted: false,
    });
  }
  return result.sort(
    (a, b) => a.course.localeCompare(b.course) || a.order - b.order || a.slug.localeCompare(b.slug),
  );
};

/** Plain lesson content (drops the admin-only fields). */
export const toPublicLesson = ({
  source: _source,
  modified: _modified,
  hidden: _hidden,
  deleted: _deleted,
  ...lesson
}: AdminLesson): Lesson => lesson;

/** What students see: not hidden, not deleted. */
export const visibleLessons = (all: readonly AdminLesson[]): Lesson[] =>
  all.filter((lesson) => !lesson.hidden && !lesson.deleted).map(toPublicLesson);
