import { ICON_PATHS, DIRECTIONAL, type IconName } from './paths';

interface IconProps {
  name: IconName;
  size?: number;
  label?: string;
  className?: string;
}

/** React twin of Icon.astro for islands. */
export function Icon({ name, size = 20, label, className = '' }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['shrink-0', DIRECTIONAL.has(name) ? 'flip-rtl' : '', className].join(' ').trim()}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
