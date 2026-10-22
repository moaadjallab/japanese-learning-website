/**
 * Dev-only placeholder marker. Spread onto any element that shows placeholder content:
 *
 *   <p {...ph('teacher bio')}>…</p>
 *
 * In development it adds data-placeholder (styled in global.css); in production it adds nothing.
 * Every placeholder is also listed in PLACEHOLDERS.md.
 */
export const ph = (label: string): Record<string, string> =>
  import.meta.env.DEV ? { 'data-placeholder': label } : {};
