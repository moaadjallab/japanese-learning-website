import { describe, expect, it } from 'vitest';
import courses from '@/content/courses.json';
import {
  courseDataSchema,
  mergeCourses,
  parseCourseForm,
  slugSchema,
  visibleCourses,
  type CourseOverrideRow,
} from '@/lib/courses/editor';
import type { Course } from '@/lib/domain/types';
import { inlineScriptBodies } from '@/lib/security/headers.js';

const base = (courses as unknown as (Omit<Course, 'slug'> & { id: string })[]).map(({ id, ...rest }) => ({
  slug: id,
  ...rest,
})) as Course[];
const kanji = base.find((c) => c.slug === 'kanji')!;
const { slug: _slug, ...kanjiData } = kanji;

const validForm = () => {
  const form = new FormData();
  const fields: Record<string, string> = {
    order: '20',
    glyph: '子供',
    glyphReading: 'kodomo — child',
    image: '/images/placeholders/courses/kanji.svg',
    titleEn: 'Japanese for Kids',
    titleAr: 'اليابانية للأطفال',
    descriptionEn: 'Playful first steps in Japanese.',
    descriptionAr: 'خطوات أولى ممتعة في اليابانية.',
    overviewEn: 'Songs, games and kana for young learners.',
    overviewAr: 'أغانٍ وألعاب وكانا للمتعلّمين الصغار.',
    outcomesEn: 'Read hiragana\n\n  Count to ten  \n',
    outcomesAr: 'قراءة الهيراغانا\nالعدّ حتى عشرة',
    exampleJa: 'こども',
    exampleRomaji: 'kodomo',
    exampleMeaningEn: 'child',
    exampleMeaningAr: 'طفل',
  };
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.append('levels', 'beginner');
  form.append('categories', 'vocabulary');
  form.append('plans', 'basic');
  form.append('plans', 'premium');
  return form;
};

describe('course editor', () => {
  it('accepts every built-in course (schema stays in sync with courses.json)', () => {
    for (const { slug, ...data } of base) {
      expect(courseDataSchema.safeParse(data).success, slug).toBe(true);
      expect(slugSchema.safeParse(slug).success, slug).toBe(true);
    }
  });

  it('validates slugs', () => {
    expect(slugSchema.safeParse('japanese-for-kids').success).toBe(true);
    for (const bad of ['Japanese', 'a', 'kids_', '-kids', 'kids--fun', 'كورس', '../x']) {
      expect(slugSchema.safeParse(bad).success, bad).toBe(false);
    }
  });

  it('parses the admin form (outcomes one per line, trimmed)', () => {
    const parsed = parseCourseForm(validForm());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.outcomes.en).toEqual(['Read hiragana', 'Count to ten']);
    expect(parsed.data.plans).toEqual(['basic', 'premium']);
    expect(parsed.data.order).toBe(20);
  });

  it('rejects incomplete forms and unsafe images', () => {
    const noArabic = validForm();
    noArabic.set('titleAr', '  ');
    expect(parseCourseForm(noArabic).success).toBe(false);
    const noLevel = validForm();
    noLevel.delete('levels');
    expect(parseCourseForm(noLevel).success).toBe(false);
    const external = validForm();
    external.set('image', 'https://evil.example/x.png');
    expect(parseCourseForm(external).success).toBe(false);
    const badPlan = validForm();
    badPlan.append('plans', 'gold');
    expect(parseCourseForm(badPlan).success).toBe(false);
  });

  it('merges edits, created courses, hidden and deleted flags', () => {
    const rows: CourseOverrideRow[] = [
      {
        id: 'kanji',
        data: JSON.stringify({ ...kanjiData, title: { en: 'Kanji+', ar: 'كانجي+' } }),
        hidden: 0,
        deleted: 0,
      },
      { id: 'japanese-n1', data: null, hidden: 1, deleted: 0 },
      { id: 'japanese-n2', data: null, hidden: 0, deleted: 1 },
      { id: 'kids', data: JSON.stringify({ ...kanjiData, order: 99 }), hidden: 0, deleted: 0 },
      { id: 'broken', data: '{not json', hidden: 0, deleted: 0 },
    ];
    const all = mergeCourses(base, rows);
    expect(all).toHaveLength(base.length + 1);
    const edited = all.find((c) => c.slug === 'kanji')!;
    expect(edited.title.en).toBe('Kanji+');
    expect(edited.modified).toBe(true);
    expect(all.find((c) => c.slug === 'kids')?.source).toBe('custom');
    expect(all.at(-1)?.slug).toBe('kids');

    const visible = visibleCourses(all).map((c) => c.slug);
    expect(visible).not.toContain('japanese-n1');
    expect(visible).not.toContain('japanese-n2');
    expect(visible).toContain('kids');
    expect(visible).not.toContain('broken');
    expect(visibleCourses(all)[0]).not.toHaveProperty('source');
  });

  it('ignores invalid stored edits (falls back to courses.json)', () => {
    const all = mergeCourses(base, [
      { id: 'kanji', data: JSON.stringify({ title: 'oops' }), hidden: 0, deleted: 0 },
    ]);
    expect(all.find((c) => c.slug === 'kanji')?.title.en).toBe(kanji.title.en);
  });

  it('finds inline scripts to hash for the CSP (JSON-LD and external scripts excluded)', () => {
    const html =
      '<script>a()</script><script src="/x.js"></script><script type="application/ld+json">{}</script>' +
      '<script type="module">b()</script><script> </script>';
    expect(inlineScriptBodies(html)).toEqual(['a()', 'b()']);
  });
});
