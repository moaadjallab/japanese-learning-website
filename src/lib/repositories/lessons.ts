/** Lesson repository (content collection today). */
import { getCollection } from 'astro:content';
import type { Lesson } from '@/lib/domain/types';

const toLesson = (entry: { id: string; data: Omit<Lesson, 'id' | 'slug'> }): Lesson => ({
  id: entry.id,
  slug: entry.id.split('/').pop() ?? entry.id,
  ...entry.data,
});

export const getLessons = async (): Promise<Lesson[]> =>
  (await getCollection('lessons')).map(toLesson).sort((a, b) => a.order - b.order);

export const getCourseLessons = async (courseSlug: string): Promise<Lesson[]> =>
  (await getLessons()).filter((lesson) => lesson.course === courseSlug);

export const getLesson = async (courseSlug: string, lessonSlug: string): Promise<Lesson | undefined> =>
  (await getCourseLessons(courseSlug)).find((lesson) => lesson.slug === lessonSlug);
