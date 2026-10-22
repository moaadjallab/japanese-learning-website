// Build-time font subsetting for Japanese display text.
//
// The full Noto Serif JP (weight 600) Japanese subset is ~1.5 MB. The site only uses a few
// hundred Japanese characters, so we scan the source for every kana/kanji/CJK symbol and
// write a tiny WOFF2 containing just those glyphs to public/fonts/noto-serif-jp-subset.woff2.
//
// Runs automatically before `dev` and `build` (see package.json). If you add Japanese text,
// it is picked up on the next run.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import subsetFont from 'subset-font';

const root = fileURLToPath(new URL('..', import.meta.url));
const SOURCE = join(
  root,
  'node_modules/@fontsource/noto-serif-jp/files/noto-serif-jp-japanese-600-normal.woff2',
);
const OUT_DIR = join(root, 'public/fonts');
const OUT = join(OUT_DIR, 'noto-serif-jp-subset.woff2');
const SCAN = ['src', 'scripts'];
const EXTENSIONS = new Set(['.astro', '.ts', '.tsx', '.json', '.md', '.mjs', '.css']);
// Code-point ranges: CJK symbols & punctuation, hiragana, katakana, CJK ideographs, full-width forms.
const RANGES = [
  [0x3000, 0x303f],
  [0x3040, 0x309f],
  [0x30a0, 0x30ff],
  [0x4e00, 0x9fff],
  [0xff00, 0xffef],
];
const isJapanese = (cp) => RANGES.some(([lo, hi]) => cp >= lo && cp <= hi);

async function* files(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (EXTENSIONS.has(extname(entry.name))) yield full;
  }
}

const chars = new Set();
for (const dir of SCAN) {
  for await (const file of files(join(root, dir))) {
    for (const ch of await readFile(file, 'utf8')) if (isJapanese(ch.codePointAt(0))) chars.add(ch);
  }
}
// Always keep basic punctuation used next to Japanese text.
for (const cp of [0x30fb, 0x3001, 0x3002, 0xff08, 0xff09, 0xff01, 0xff1f, 0x30fc, 0x300c, 0x300d, 0x3000]) {
  chars.add(String.fromCodePoint(cp));
}

const text = [...chars].sort().join('');
const subset = await subsetFont(await readFile(SOURCE), text, { targetFormat: 'woff2' });
await mkdir(OUT_DIR, { recursive: true });
await writeFile(OUT, subset);
console.log(`[subset-jp-font] ${chars.size} characters → ${(subset.length / 1024).toFixed(1)} KiB (${OUT.replace(root, '')})`);
