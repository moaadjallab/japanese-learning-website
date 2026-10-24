/**
 * Shared class recipes so Astro components and React islands look identical.
 * Keep class strings literal (Tailwind scans source files for them).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

// Micro-interactions: a direction-aware arrow nudge on hover and a short press-down on click.
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,color,box-shadow,transform,scale] duration-200 ease-out-soft active:scale-[0.98] [&_.flip-rtl]:transition-[translate] [&_.flip-rtl]:duration-300 hover:[&_.flip-rtl]:translate-x-1 rtl:hover:[&_.flip-rtl]:-translate-x-1 disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-soft hover:bg-primary-hover hover:shadow-lift active:translate-y-px',
  secondary:
    'bg-surface-raised text-fg ring-1 ring-inset ring-line hover:ring-stone-300 hover:bg-stone-50 active:translate-y-px',
  ghost: 'text-fg hover:bg-stone-100',
  inverse: 'bg-washi text-ink hover:bg-white shadow-soft active:translate-y-px',
  link: 'text-primary underline-offset-4 hover:underline rounded-sm',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-[0.95rem]',
  lg: 'h-13 px-7 text-base',
};

export const buttonClass = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string =>
  [buttonBase, buttonVariants[variant], variant === 'link' ? '' : buttonSizes[size], extra]
    .filter(Boolean)
    .join(' ');

export const inputClass =
  'block w-full rounded-xl border border-line bg-surface-raised px-4 py-3 text-base text-fg placeholder:text-stone-500 transition-colors hover:border-stone-300 focus:border-primary focus:outline-3 focus:outline-offset-0 focus:outline-primary/20 aria-invalid:border-primary aria-invalid:bg-sakura-soft disabled:opacity-60';

export const labelClass = 'block text-sm font-semibold text-fg';
export const hintClass = 'text-sm text-fg-muted';
export const errorClass = 'flex items-start gap-1.5 text-sm font-medium text-vermilion-dark';

export const cardClass = 'rounded-card bg-surface-raised ring-1 ring-line shadow-soft';

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'ink';
const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-stone-700',
  primary: 'bg-primary text-on-primary',
  accent: 'bg-sakura text-ink',
  ink: 'bg-ink text-washi',
};
export const badgeClass = (tone: BadgeTone = 'neutral') =>
  `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`;
