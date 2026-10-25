/**
 * Lesson repository. Built-in lessons come from the `lessons` content collection
 * (src/content/lessons.json); changes made in the admin lesson editor live in D1
 * (`lesson_overrides`) and are merged on top at request time. Without a database only the
 * built-in lessons are returned.
 */
import { getCollection } from 'astro:content';
import type { Lesson } from '@/lib/domain/types';
import {
  mergeLessons,
  visibleLessons,
  type AdminLesson,
  type LessonOverrideRow,
} from '@/lib/courses/lessons';

type Db = D1Database | null | undefined;

const toLesson = (entry: { id: string; data: Omit<Lesson, 'id' | 'slug'> }): Lesson => ({
  id: entry.id,
  slug: entry.id.split('/').pop() ?? entry.id,
  ...entry.data,
});

export const getBuiltinLessons = async (): Promise<Lesson[]> =>
  (await getCollection('lessons')).map(toLesson).sort((a, b) => a.order - b.order);

const getOverrides = async (db: Db): Promise<LessonOverrideRow[]> => {
  if (!db) return [];
  try {
    const { results } = await db
      .prepare('SELECT id, course_id, data, hidden, deleted, updated_at FROM lesson_overrides')
      .all<LessonOverrideRow>();
    return results;
  } catch (error) {
    // Table missing (migration 0004 not applied yet): fall back to the built-in lessons.
    console.error('[lessons] could not read lesson_overrides', error);
    return [];
  }
};

/** Every lesson with its admin state (hidden, deleted, modified, source). */
export const getAdminLessons = async (db: Db): Promise<AdminLesson[]> =>
  mergeLessons(await getBuiltinLessons(), await getOverrides(db));

/** Lessons visible to students, ordered by course then position. */
export const getLessons = async (db?: Db): Promise<Lesson[]> => visibleLessons(await getAdminLessons(db));

export const getCourseLessons = async (courseSlug: string, db?: Db): Promise<Lesson[]> =>
  (await getLessons(db)).filter((lesson) => lesson.course === courseSlug);

export const getLesson = async (
  courseSlug: string,
  lessonSlug: string,
  db?: Db,
): Promise<Lesson | undefined> =>
  (await getCourseLessons(courseSlug, db)).find((lesson) => lesson.slug === lessonSlug);
