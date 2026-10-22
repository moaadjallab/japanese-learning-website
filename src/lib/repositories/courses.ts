/**
 * Course repository. V1 reads Astro content collections; V2 can swap the
 * implementation for Cloudflare D1 while keeping these function signatures.
 */
import { getCollection, getEntry } from 'astro:content';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/i18n/config';
import { levelRangeLabel } from '@/lib/catalog/filter';
import type { Course, CourseCardData } from '@/lib/domain/types';
import { routes } from '@/lib/routes';

const toCourse = (entry: { id: string; data: Omit<Course, 'slug'> }): Course => ({
  slug: entry.id,
  ...entry.data,
});

export const getCourses = async (): Promise<Course[]> =>
  (await getCollection('courses')).map(toCourse).sort((a, b) => a.order - b.order);

export const getCourse = async (slug: string): Promise<Course | undefined> => {
  const entry = await getEntry('courses', slug);
  return entry ? toCourse(entry) : undefined;
};

/** Courses sharing a level or category with `course`, most similar first. */
export const getRelatedCourses = async (course: Course, limit = 3): Promise<Course[]> => {
  const all = await getCourses();
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

export const getCourseCards = async (lang: Locale): Promise<CourseCardData[]> =>
  (await getCourses()).map((course) => toCourseCard(course, lang));
