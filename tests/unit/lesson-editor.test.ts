import { describe, expect, it } from 'vitest';
import lessons from '@/content/lessons.json';
import {
  formatItems,
  lessonDataSchema,
  mergeLessons,
  normalizeVideoUrl,
  parseItems,
  parseLessonForm,
  visibleLessons,
  type LessonOverrideRow,
} from '@/lib/courses/lessons';
import type { Lesson } from '@/lib/domain/types';

const base = (lessons as unknown as (Omit<Lesson, 'slug'> & { id: string })[]).map((l) => ({
  ...l,
  slug: l.id.split('/').pop()!,
})) as Lesson[];
const first = base.find((l) => l.id === 'japanese-n5/core-particles')!;
const { id: _id, slug: _slug, course: _course, ...firstData } = first;

const form = (overrides: Record<string, string> = {}) => {
  const f = new FormData();
  const fields = {
    order: '9',
    type: 'video',
    durationMin: '12',
    videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    titleEn: 'Greetings',
    titleAr: 'التحيات',
    summaryEn: 'Say hello and thank you.',
    summaryAr: 'قل مرحبًا وشكرًا.',
    items: 'こんにちは | konnichiwa | hello | مرحبًا\n\nありがとう | arigatō | thank you | شكرًا',
    ...overrides,
  };
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe('lesson editor', () => {
  it('accepts every built-in lesson (schema stays in sync with lessons.json)', () => {
    for (const { id, slug: _s, course: _c, ...data } of base) {
      expect(lessonDataSchema.safeParse(data).success, id).toBe(true);
    }
  });

  it('normalizes video links to embeddable URLs allowed by the CSP', () => {
    const embed = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    expect(normalizeVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe(embed);
    expect(normalizeVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(embed);
    expect(normalizeVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(embed);
    expect(normalizeVideoUrl(embed)).toBe(embed);
    expect(normalizeVideoUrl('https://vimeo.com/76979871')).toBe('https://player.vimeo.com/video/76979871');
    expect(normalizeVideoUrl('https://player.vimeo.com/video/76979871')).toBe(
      'https://player.vimeo.com/video/76979871',
    );
    const stream = 'https://customer-abc.cloudflarestream.com/xyz/iframe';
    expect(normalizeVideoUrl(stream)).toBe(stream);
    for (const bad of [
      'http://youtu.be/dQw4w9WgXcQ',
      'https://evil.example/watch?v=dQw4w9WgXcQ',
      'https://youtube.com.evil.example/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=short',
      'javascript:alert(1)',
      'not a url',
    ]) {
      expect(normalizeVideoUrl(bad), bad).toBeNull();
    }
  });

  it('round-trips the vocabulary format and reports bad lines', () => {
    expect(parseItems(formatItems(first.items)).items).toEqual(first.items);
    const { items, badLines } = parseItems('a | b | c | d\nonly | three | parts\n\n | b | c | d');
    expect(items).toHaveLength(1);
    expect(badLines).toEqual([2, 4]);
  });

  it('parses the admin form (video converted, empty lines ignored)', () => {
    const parsed = parseLessonForm(form());
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.videoUrl).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(parsed.data.items).toHaveLength(2);
    expect(parseLessonForm(form({ videoUrl: '' }))).toMatchObject({
      success: true,
      data: { videoUrl: null },
    });
  });

  it('rejects bad videos, bad vocabulary and missing Arabic', () => {
    expect(parseLessonForm(form({ videoUrl: 'https://example.com/v.mp4' }))).toMatchObject({
      success: false,
      badVideo: true,
    });
    expect(parseLessonForm(form({ items: 'a | b' }))).toMatchObject({ success: false, badLines: [1] });
    expect(parseLessonForm(form({ titleAr: ' ' })).success).toBe(false);
    expect(parseLessonForm(form({ type: 'podcast' })).success).toBe(false);
  });

  it('merges edits, created lessons, hidden and deleted flags', () => {
    const rows: LessonOverrideRow[] = [
      {
        id: first.id,
        course_id: 'japanese-n5',
        data: JSON.stringify({ ...firstData, title: { en: 'Particles!', ar: 'الأدوات!' } }),
        hidden: 0,
        deleted: 0,
      },
      { id: 'japanese-n5/time-and-days', course_id: 'japanese-n5', data: null, hidden: 1, deleted: 0 },
      { id: 'japanese-n5/adjectives', course_id: 'japanese-n5', data: null, hidden: 0, deleted: 1 },
      {
        id: 'japanese-n5/greetings',
        course_id: 'japanese-n5',
        data: JSON.stringify({ ...firstData, order: 99 }),
        hidden: 0,
        deleted: 0,
      },
      { id: 'japanese-n5/broken', course_id: 'japanese-n5', data: '{', hidden: 0, deleted: 0 },
      { id: 'other/x', course_id: 'japanese-n5', data: JSON.stringify(firstData), hidden: 0, deleted: 0 },
    ];
    const all = mergeLessons(base, rows);
    expect(all).toHaveLength(base.length + 1);
    expect(all.find((l) => l.id === first.id)).toMatchObject({ modified: true, title: { en: 'Particles!' } });
    const created = all.find((l) => l.id === 'japanese-n5/greetings');
    expect(created).toMatchObject({ source: 'custom', slug: 'greetings', course: 'japanese-n5' });

    const n5 = visibleLessons(all)
      .filter((l) => l.course === 'japanese-n5')
      .map((l) => l.slug);
    expect(n5).not.toContain('time-and-days');
    expect(n5).not.toContain('adjectives');
    expect(n5.at(-1)).toBe('greetings');
    expect(visibleLessons(all)[0]).not.toHaveProperty('source');
  });
});
