/**
 * Sanity checks on the content data files (the Astro build also validates them with Zod).
 * Guards the V1 content rules: no invented prices, placeholder testimonials, spec course list.
 */
import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import courses from '@/content/courses.json';
import plans from '@/content/plans.json';
import faqs from '@/content/faqs.json';
import testimonials from '@/content/testimonials.json';

describe('courses.json', () => {
  it('contains the 14 courses from the spec', () => {
    expect(courses.map((c) => c.title.en)).toEqual([
      'Beginner Japanese',
      'Japanese N5',
      'Japanese N4',
      'Japanese N3',
      'Japanese N2',
      'Japanese N1',
      'JLPT Preparation',
      'Japanese Conversation',
      'Japanese for Travel',
      'Japanese for Work',
      'Hiragana & Katakana',
      'Kanji',
      'Japanese Grammar',
      'Japanese Vocabulary',
    ]);
  });
  it('has unique slugs and an image file for each course', () => {
    expect(new Set(courses.map((c) => c.id)).size).toBe(courses.length);
    for (const c of courses) expect(existsSync(`public${c.image}`), c.image).toBe(true);
  });
  it('has Arabic text for every localized field', () => {
    for (const c of courses) {
      for (const field of [c.title, c.description, c.overview, c.example.meaning]) {
        expect(field.ar).toMatch(/[\u0600-\u06FF]/);
      }
      expect(c.outcomes.ar).toHaveLength(c.outcomes.en.length);
    }
  });
  it('Japanese examples contain Japanese script', () => {
    for (const c of courses) expect(c.example.ja).toMatch(/[\u3040-\u30FF\u4E00-\u9FFF]/);
  });
});

describe('plans.json', () => {
  it('has Basic, Premium (highlighted) and Private, all monthly', () => {
    expect(plans.map((p) => p.id)).toEqual(['basic', 'premium', 'private']);
    expect(plans.filter((p) => p.highlighted).map((p) => p.id)).toEqual(['premium']);
    for (const p of plans) expect(p.interval).toBe('month');
  });
  it('ships without invented prices', () => {
    for (const p of plans) expect(p.price).toBeNull();
  });
});

describe('faqs.json', () => {
  it('covers the 4 FAQ categories and the 9 home-page questions', () => {
    expect(new Set(faqs.map((f) => f.category))).toEqual(new Set(['courses', 'subscriptions', 'classes', 'payments']));
    expect(faqs.filter((f) => 'homeOrder' in f)).toHaveLength(9);
  });
});

describe('testimonials.json', () => {
  it('only contains placeholders (no invented reviews)', () => {
    for (const item of testimonials) {
      expect(item.placeholder).toBe(true);
      expect(item.name).toBeNull();
      expect(item.quote).toBeNull();
    }
  });
});
