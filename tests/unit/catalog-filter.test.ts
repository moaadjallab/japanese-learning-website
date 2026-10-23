import { describe, expect, it } from 'vitest';
import {
  filterCourses,
  levelRangeLabel,
  normalizeSearch,
  parseFilters,
  serializeFilters,
} from '@/lib/catalog/filter';
import type { CourseCardData } from '@/lib/domain/types';
import { en } from '@/i18n/en';

const card = (over: Partial<CourseCardData>): CourseCardData => ({
  slug: 'x',
  href: '/en/courses/x/',
  title: 'Title',
  description: 'Description',
  image: '/x.svg',
  glyph: '字',
  levels: ['n5'],
  categories: ['kanji'],
  levelLabel: 'N5',
  categoryLabel: 'Kanji',
  ...over,
});

describe('catalog filter', () => {
  const courses = [
    card({ slug: 'kanji', title: 'Kanji', levels: ['n5', 'n4', 'n3', 'n2', 'n1'], categories: ['kanji'] }),
    card({
      slug: 'travel',
      title: 'Japanese for Travel',
      levels: ['beginner', 'n5'],
      categories: ['travel', 'conversation'],
    }),
    card({
      slug: 'ar',
      title: 'الهيراغانا والكاتاكانا',
      levels: ['beginner'],
      categories: ['hiragana-katakana'],
    }),
  ];
  it('filters by level and category', () => {
    expect(filterCourses(courses, { q: '', level: 'n1', category: '' }).map((c) => c.slug)).toEqual([
      'kanji',
    ]);
    expect(filterCourses(courses, { q: '', level: '', category: 'conversation' }).map((c) => c.slug)).toEqual(
      ['travel'],
    );
    expect(filterCourses(courses, { q: '', level: 'beginner', category: 'kanji' })).toHaveLength(0);
  });
  it('searches case- and diacritic-insensitively, including Arabic', () => {
    expect(filterCourses(courses, { q: 'TRAVEL', level: '', category: '' }).map((c) => c.slug)).toEqual([
      'travel',
    ]);
    expect(filterCourses(courses, { q: 'الهيراغانا', level: '', category: '' }).map((c) => c.slug)).toEqual([
      'ar',
    ]);
    expect(normalizeSearch('Ryokō')).toBe('ryoko');
    expect(normalizeSearch('أَهلاً')).toBe('اهلا');
  });
  it('round-trips URL params and ignores invalid values', () => {
    expect(parseFilters('?level=n3&category=work&q=keigo')).toEqual({
      q: 'keigo',
      level: 'n3',
      category: 'work',
    });
    expect(parseFilters('?level=n9&category=<script>')).toEqual({ q: '', level: '', category: '' });
    expect(serializeFilters({ q: ' kanji ', level: 'n5', category: '' })).toBe('?q=kanji&level=n5');
    expect(serializeFilters({ q: '', level: '', category: '' })).toBe('');
  });
  it('labels level ranges in curriculum order', () => {
    expect(levelRangeLabel(['n1', 'n5', 'n3'], en.levels)).toBe('N5 – N1');
    expect(levelRangeLabel(['beginner'], en.levels)).toBe('Beginner');
    expect(levelRangeLabel(['n5', 'beginner'], en.levels)).toBe('Beginner – N5');
  });
});
