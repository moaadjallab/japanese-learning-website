/**
 * Lesson editor formats with no dependencies (also bundled in the admin page's browser script):
 * video link normalisation and the "one word per line" vocabulary format.
 */
export interface LessonItem {
  ja: string;
  romaji: string;
  meaning: { en: string; ar: string };
}

/**
 * Turn a pasted video link into an embeddable URL allowed by the CSP (frame-src), or null.
 *   youtube.com/watch?v=ID · youtu.be/ID · youtube(-nocookie).com/embed/ID → youtube-nocookie embed
 *   vimeo.com/123 · player.vimeo.com/video/123                             → player.vimeo.com/video/123
 *   https://<sub>.cloudflarestream.com/…                                    → kept as is
 */
export const normalizeVideoUrl = (input: string): string | null => {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.replace(/^www\./, '');
  const youtubeId = /^[A-Za-z0-9_-]{11}$/;
  if (
    host === 'youtube.com' ||
    host === 'm.youtube.com' ||
    host === 'youtube-nocookie.com' ||
    host === 'youtu.be'
  ) {
    const id =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : url.pathname === '/watch'
          ? (url.searchParams.get('v') ?? '')
          : (/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? '');
    return youtubeId.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = /^\/(?:video\/)?(\d{5,12})\/?$/.exec(url.pathname)?.[1];
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (url.hostname.endsWith('.cloudflarestream.com')) return url.href;
  return null;
};

/** Vocabulary as edited in the admin: one word per line, "ja | romaji | meaning EN | meaning AR". */
export const formatItems = (items: readonly LessonItem[]) =>
  items.map((i) => [i.ja, i.romaji, i.meaning.en, i.meaning.ar].join(' | ')).join('\n');

/** Parse the vocabulary textarea. Returns the 1-based numbers of malformed lines, if any. */
export const parseItems = (input: string): { items: LessonItem[]; badLines: number[] } => {
  const items: LessonItem[] = [];
  const badLines: number[] = [];
  input.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const parts = line.split('|').map((part) => part.trim());
    const [ja, romaji, en, ar] = parts;
    if (parts.length !== 4 || !ja || !romaji || !en || !ar) badLines.push(index + 1);
    else items.push({ ja, romaji, meaning: { en, ar } });
  });
  return { items, badLines };
};
