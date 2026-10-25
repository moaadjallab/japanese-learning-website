/**
 * Course repository. Built-in courses come from the `courses` content collection
 * (src/content/courses.json); changes made in /admin/courses/ live in D1 (`course_overrides`)
 * and are merged on top at request time. Without a database (build time) only the built-in
 * courses are returned.
 */
import { getCollection } from 'astro:content';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/i18n/config';
import { levelRangeLabel } from '@/lib/catalog/filter';
import type { Course, CourseCardData } from '@/lib/domain/types';
import { routes } from '@/lib/routes';
import {
  mergeCourses,
  visibleCourses,
  type AdminCourse,
  type CourseOverrideRow,
} from '@/lib/courses/editor';

type Db = D1Database | null | undefined;

const toCourse = (entry: { id: string; data: Omit<Course, 'slug'> }): Course => ({
  slug: entry.id,
  ...entry.data,
});

export const getBuiltinCourses = async (): Promise<Course[]> =>
  (await getCollection('courses')).map(toCourse).sort((a, b) => a.order - b.order);

const getOverrides = async (db: Db): Promise<CourseOverrideRow[]> => {
  if (!db) return [];
  try {
    const { results } = await db
      .prepare('SELECT id, data, hidden, deleted, updated_at FROM course_overrides')
      .all<CourseOverrideRow>();
    return results;
  } catch (error) {
    // Table missing (migration 0003 not applied yet): fall back to the built-in courses.
    console.error('[courses] could not read course_overrides', error);
    return [];
  }
};

/** Every course with its admin state (hidden, deleted, modified, source). */
export const getAdminCourses = async (db: Db): Promise<AdminCourse[]> =>
  mergeCourses(await getBuiltinCourses(), await getOverrides(db));

/** Courses visible to visitors and students. */
export const getCourses = async (db?: Db): Promise<Course[]> => visibleCourses(await getAdminCourses(db));

export const getCourse = async (slug: string, db?: Db): Promise<Course | undefined> =>
  (await getCourses(db)).find((course) => course.slug === slug);

/** Courses sharing a level or category with `course`, most similar first. */
export const getRelatedCourses = async (course: Course, db?: Db, limit = 3): Promise<Course[]> => {
  const all = await getCourses(db);
  const score = (c: Course) =>
    c.categories.filter((x) => course.categories.includes(x)).length * 2 +
    c.levels.filter((x) => course.levels.includes(x)).length;
  return all
    .filter((c) => c.slug !== course.slug)
    .map((c) => ({ c, s: score(c) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s || a.c.order - b.c.order)
    .slice(0, limit)
    .map(({ c }) => c);
};

/** Localized, serializable card data (passed to the CourseExplorer island). */
export const toCourseCard = (course: Course, lang: Locale): CourseCardData => {
  const dict = getDictionary(lang);
  const primaryCategory = course.categories[0];
  return {
    slug: course.slug,
    href: routes.course(lang, course.slug),
    title: course.title[lang],
    description: course.description[lang],
    image: course.image,
    glyph: course.glyph,
    levels: course.levels,
    categories: course.categories,
    levelLabel: levelRangeLabel(course.levels, dict.levels),
    categoryLabel: primaryCategory ? dict.categories[primaryCategory] : '',
  };
};

export const getCourseCards = async (lang: Locale, db?: Db): Promise<CourseCardData[]> =>
  (await getCourses(db)).map((course) => toCourseCard(course, lang));
