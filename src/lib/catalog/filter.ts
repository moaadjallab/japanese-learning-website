/**
 * Pure course-catalog logic: search normalization, filtering, URL (de)serialization
 * and level-range labels. Used by the CourseExplorer island and unit-tested.
 */
import {
  LEVEL_IDS,
  isCategoryId,
  isLevelId,
  type CategoryId,
  type CourseCardData,
  type LevelId,
} from '@/lib/domain/types';

export interface CatalogFilters {
  q: string;
  level: LevelId | '';
  category: CategoryId | '';
}

export const EMPTY_FILTERS: CatalogFilters = { q: '', level: '', category: '' };

/**
 * Normalize text for forgiving search: lowercase, strip Latin diacritics (ō → o),
 * strip Arabic tashkeel/tatweel and unify alef/yaa/taa-marbuta variants.
 */
export const normalizeSearch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();

/** Read filters from a query string, ignoring unknown/invalid values. */
export const parseFilters = (search: string | URLSearchParams): CatalogFilters => {
  const params = typeof search === 'string' ? new URLSearchParams(search) : search;
  const level = params.get('level') ?? '';
  const category = params.get('category') ?? '';
  return {
    q: (params.get('q') ?? '').slice(0, 100),
    level: isLevelId(level) ? level : '',
    category: isCategoryId(category) ? category : '',
  };
};

/** Serialize filters to a query string ("" when no filter is active). */
export const serializeFilters = (filters: CatalogFilters): string => {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.level) params.set('level', filters.level);
  if (filters.category) params.set('category', filters.category);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const hasActiveFilters = (filters: CatalogFilters) =>
  Boolean(filters.q.trim() || filters.level || filters.category);

/** Every search term must appear in the course's title, description, level or category labels. */
export const filterCourses = <T extends CourseCardData>(courses: T[], filters: CatalogFilters): T[] => {
  const terms = normalizeSearch(filters.q).split(' ').filter(Boolean);
  return courses.filter((course) => {
    if (filters.level && !course.levels.includes(filters.level)) return false;
    if (filters.category && !course.categories.includes(filters.category)) return false;
    if (terms.length === 0) return true;
    const haystack = normalizeSearch(
      [course.title, course.description, course.levelLabel, course.categoryLabel, course.glyph, course.slug].join(' '),
    );
    return terms.every((term) => haystack.includes(term));
  });
};

/** "Beginner", "N5", or a range in curriculum order: "N5 – N1", "Beginner – N5". */
export const levelRangeLabel = (levels: readonly LevelId[], labels: Readonly<Record<LevelId, string>>): string => {
  const sorted = [...levels].sort((a, b) => LEVEL_IDS.indexOf(a) - LEVEL_IDS.indexOf(b));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return '';
  return first === last ? labels[first] : `${labels[first]} – ${labels[last]}`;
};
