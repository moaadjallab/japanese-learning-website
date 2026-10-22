/**
 * Course catalog island: search + level filter + category filter.
 * - Filters stay in sync with the URL (?q=&level=&category=) via history.replaceState,
 *   so filtered views are shareable and survive reloads / back navigation.
 * - The language switcher links are updated to carry the same query string.
 * - The server renders the full list (works without JS); filters apply after hydration.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import type { PluralForms } from '@/i18n';
import {
  EMPTY_FILTERS,
  filterCourses,
  hasActiveFilters,
  parseFilters,
  serializeFilters,
  type CatalogFilters,
} from '@/lib/catalog/filter';
import type { CategoryId, CourseCardData, LevelId } from '@/lib/domain/types';
import { CourseCard } from './CourseCard';

export interface CourseExplorerLabels {
  searchLabel: string;
  searchPlaceholder: string;
  levelLabel: string;
  categoryLabel: string;
  allLevels: string;
  allCategories: string;
  resultCount: PluralForms;
  emptyTitle: string;
  emptyBody: string;
  clearFilters: string;
  filtersLabel: string;
  viewCourse: string;
  level: string;
  category: string;
}

interface Props {
  locale: 'en' | 'ar';
  courses: CourseCardData[];
  levels: { value: LevelId; label: string }[];
  categories: { value: CategoryId; label: string }[];
  labels: CourseExplorerLabels;
}

const countLabel = (locale: string, forms: PluralForms, count: number) => {
  const rule = new Intl.PluralRules(locale).select(count);
  return (forms[rule] ?? forms.other).replace('{count}', String(count));
};

export default function CourseExplorer({ locale, courses, levels, categories, labels }: Props) {
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const hydrated = useRef(false);

  // Read the initial filters from the URL after hydration (keeps SSR markup identical).
  useEffect(() => {
    const fromUrl = () => setFilters(parseFilters(window.location.search));
    fromUrl();
    hydrated.current = true;
    window.addEventListener('popstate', fromUrl);
    return () => window.removeEventListener('popstate', fromUrl);
  }, []);

  // Reflect filters in the URL and in the language-switcher links.
  useEffect(() => {
    if (!hydrated.current) return;
    const qs = serializeFilters(filters);
    const url = `${window.location.pathname}${qs}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', url);
    }
    document.querySelectorAll<HTMLAnchorElement>('a[data-lang-switch]').forEach((link) => {
      const target = new URL(link.href);
      target.search = qs;
      link.href = target.toString();
    });
  }, [filters]);

  const results = useMemo(() => filterCourses(courses, filters), [courses, filters]);
  const update = (patch: Partial<CatalogFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const active = hasActiveFilters(filters);

  return (
    <div>
      <form
        role="search"
        aria-label={labels.filtersLabel}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-4 rounded-card bg-surface-raised p-4 shadow-soft ring-1 ring-line sm:p-5 md:grid-cols-[1.6fr_1fr_1fr]"
      >
        <div className="space-y-2">
          <label htmlFor="course-search" className={labelClass}>
            {labels.searchLabel}
          </label>
          <div className="relative">
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-fg-muted"
            />
            <input
              id="course-search"
              type="search"
              name="q"
              value={filters.q}
              onChange={(e) => update({ q: e.target.value })}
              placeholder={labels.searchPlaceholder}
              autoComplete="off"
              enterKeyHint="search"
              maxLength={100}
              className={`${inputClass} ps-11`}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="course-level" className={labelClass}>
            {labels.levelLabel}
          </label>
          <div className="relative">
            <select
              id="course-level"
              name="level"
              value={filters.level}
              onChange={(e) => update({ level: e.target.value as LevelId | '' })}
              className={`${inputClass} appearance-none pe-11`}
            >
              <option value="">{labels.allLevels}</option>
              {levels.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              size={18}
              className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-fg-muted"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="course-category" className={labelClass}>
            {labels.categoryLabel}
          </label>
          <div className="relative">
            <select
              id="course-category"
              name="category"
              value={filters.category}
              onChange={(e) => update({ category: e.target.value as CategoryId | '' })}
              className={`${inputClass} appearance-none pe-11`}
            >
              <option value="">{labels.allCategories}</option>
              {categories.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <Icon
              name="chevron-down"
              size={18}
              className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-fg-muted"
            />
          </div>
        </div>
      </form>

      <div className="mt-6 flex min-h-10 flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-fg" aria-live="polite" aria-atomic="true" data-testid="result-count">
          {countLabel(locale, labels.resultCount, results.length)}
        </p>
        {active && (
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className={buttonClass('ghost', 'sm')}>
            <Icon name="x" size={16} />
            {labels.clearFilters}
          </button>
        )}
      </div>

      {results.length > 0 ? (
        <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="course-results">
          {results.map((course, i) => (
            <li key={course.slug}>
              <CourseCard
                course={course}
                eager={i < 3}
                labels={{ viewCourse: labels.viewCourse, level: labels.level, category: labels.category }}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-card bg-surface-raised px-6 py-14 text-center ring-1 ring-line" data-testid="course-empty">
          <span lang="ja" aria-hidden="true" className="font-jp block text-5xl text-stone-300">
            無
          </span>
          <h2 className="mt-4 text-xl font-semibold">{labels.emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-md text-fg-muted">{labels.emptyBody}</p>
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className={buttonClass('secondary', 'md', 'mt-6')}>
            {labels.clearFilters}
          </button>
        </div>
      )}
    </div>
  );
}
