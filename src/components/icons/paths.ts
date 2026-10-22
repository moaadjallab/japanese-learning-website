/**
 * Original 24×24 stroke icon set (stroke="currentColor", stroke-width 1.75).
 * Shared by Icon.astro and Icon.tsx. Icons in DIRECTIONAL are mirrored in RTL.
 */
export const ICON_PATHS = {
  'arrow-right': 'M5 12h14M13 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  chat: 'M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z',
  camera:
    'M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM16.8 9h.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  video: 'M4 7h11v10H4zM15 10.5l5-3v9l-5-3',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 15V9a3 3 0 0 1 3-3h6M18 9v6a3 3 0 0 1-3 3H9',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  lantern: 'M9 3h6M10 3v2M14 3v2M7 8a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0zM7 11h10M9 21h6M12 19v2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  'user-plus': 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 20a7 7 0 0 1 12.5-4.3M19 14v6M16 17h6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'eye-off': 'M3 3l18 18M10.6 6a9.6 9.6 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.6 3.3M6.4 7.5C3.9 9.2 2.5 12 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8M9.9 9.9a3 3 0 0 0 4.2 4.2',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  alert: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  quote: 'M10 7H6a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3l3-3V9a2 2 0 0 0-1-2zM20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3l3-3V9a2 2 0 0 0-1-2z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
} as const;

export type IconName = keyof typeof ICON_PATHS;

/** Icons whose meaning depends on reading direction. */
export const DIRECTIONAL: ReadonlySet<IconName> = new Set(['arrow-right', 'chevron-right', 'external']);
