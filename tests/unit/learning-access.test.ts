import { describe, expect, it } from 'vitest';
import {
  canAccessCourse,
  canJoinLive,
  cheapestPlanFor,
  lessonNeighbours,
  nextLesson,
  progressPercent,
} from '@/lib/learning/access';
import type { Lesson } from '@/lib/domain/types';
import lessonsJson from '@/content/lessons.json';
import coursesJson from '@/content/courses.json';

const lesson = (id: string, order: number): Lesson => ({
  id: `c/${id}`,
  slug: id,
  course: 'c',
  order,
  type: 'video',
  durationMin: 10,
  videoUrl: null,
  title: { en: id, ar: id },
  summary: { en: '', ar: '' },
  items: [],
});

describe('course access', () => {
  it('requires an active plan included in the course', () => {
    expect(canAccessCourse(null, ['basic', 'premium', 'private'])).toBe(false);
    expect(canAccessCourse('basic', ['basic', 'premium', 'private'])).toBe(true);
    expect(canAccessCourse('basic', ['premium', 'private'])).toBe(false);
    expect(canAccessCourse('private', ['premium', 'private'])).toBe(true);
  });
  it('live classes need Premium or above', () => {
    expect(canJoinLive(null, 'premium')).toBe(false);
    expect(canJoinLive('basic', 'premium')).toBe(false);
    expect(canJoinLive('premium', 'premium')).toBe(true);
    expect(canJoinLive('premium', 'private')).toBe(false);
    expect(canJoinLive('private', 'premium')).toBe(true);
  });
  it('finds the cheapest unlocking plan', () => {
    expect(cheapestPlanFor(['private', 'premium'])).toBe('premium');
    expect(cheapestPlanFor([])).toBeNull();
  });
});

describe('progress', () => {
  const lessons = [lesson('a', 1), lesson('b', 2), lesson('c', 3)];
  it('computes percentages safely', () => {
    expect(progressPercent(0, 0)).toBe(0);
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(5, 3)).toBe(100);
  });
  it('resumes at the first unfinished lesson', () => {
    expect(nextLesson(lessons, new Set())?.slug).toBe('a');
    expect(nextLesson(lessons, new Set(['c/a']))?.slug).toBe('b');
    expect(nextLesson(lessons, new Set(['c/a', 'c/b', 'c/c']))?.slug).toBe('a');
  });
  it('gives previous/next lessons', () => {
    expect(lessonNeighbours(lessons, 'c/b')).toMatchObject({ position: 2 });
    expect(lessonNeighbours(lessons, 'c/a').previous).toBeUndefined();
    expect(lessonNeighbours(lessons, 'c/c').next).toBeUndefined();
  });
});

describe('lessons.json', () => {
  it('references existing courses, uses course-prefixed ids and unique orders', () => {
    const slugs = new Set(coursesJson.map((c) => c.id));
    const seen = new Set<string>();
    for (const l of lessonsJson) {
      expect(slugs.has(l.course), l.id).toBe(true);
      expect(l.id.startsWith(`${l.course}/`)).toBe(true);
      const key = `${l.course}:${l.order}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
      for (const item of l.items) expect(item.meaning.ar).toBeTruthy();
    }
  });
});
