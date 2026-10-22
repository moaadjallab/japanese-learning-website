/** React twin of CourseCard.astro (keep the markup in sync). */
import { Icon } from '@/components/icons/Icon';
import { badgeClass } from '@/components/ui/styles';
import type { CourseCardData } from '@/lib/domain/types';

interface Props {
  course: CourseCardData;
  labels: { viewCourse: string; level: string; category: string };
  eager?: boolean;
}

export function CourseCard({ course, labels, eager = false }: Props) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card bg-surface-raised shadow-soft ring-1 ring-line transition-[box-shadow,transform] duration-300 ease-out-soft focus-within:shadow-lift hover:-translate-y-0.5 hover:shadow-lift">
      <div className="aspect-[16/10] overflow-hidden bg-stone-100">
        <img
          src={course.image}
          alt=""
          width={640}
          height={400}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          <span className={badgeClass('accent')}>
            <span className="sr-only">{labels.level}: </span>
            {course.levelLabel}
          </span>
          <span className={badgeClass('neutral')}>
            <span className="sr-only">{labels.category}: </span>
            {course.categoryLabel}
          </span>
        </div>
        <h2 className="mt-3 text-lg font-semibold">
          <a href={course.href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {course.title}
          </a>
        </h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-fg-muted">{course.description}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary" aria-hidden="true">
          {labels.viewCourse}
          <Icon
            name="arrow-right"
            size={16}
            className="transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
          />
        </span>
      </div>
      <span
        className="pointer-events-none absolute inset-0 rounded-card opacity-0 ring-2 ring-primary group-focus-within:opacity-100"
        aria-hidden="true"
      />
    </article>
  );
}
