// Generates original placeholder SVG artwork for each course into
// public/images/placeholders/courses/<slug>.svg (replace with real images later).
// Usage: node scripts/generate-course-images.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const courses = JSON.parse(await readFile(new URL('../src/content/courses.json', import.meta.url), 'utf8'));
const outDir = new URL('../public/images/placeholders/courses/', import.meta.url);
await mkdir(outDir, { recursive: true });

const palettes = {
  jlpt: { bg: '#F6ECE8', ring: '#C8312B', ink: '#1B1B1F' },
  conversation: { bg: '#F7E7EB', ring: '#D9919F', ink: '#1B1B1F' },
  travel: { bg: '#E8EFEC', ring: '#6E8F82', ink: '#1B1B1F' },
  work: { bg: '#E9EBF1', ring: '#4B5878', ink: '#1B1B1F' },
  grammar: { bg: '#F1EDE4', ring: '#A08A5E', ink: '#1B1B1F' },
  kanji: { bg: '#EFE8DF', ring: '#1B1B1F', ink: '#1B1B1F' },
  vocabulary: { bg: '#F4EBE2', ring: '#C77D4A', ink: '#1B1B1F' },
  'hiragana-katakana': { bg: '#FBF0F2', ring: '#C8312B', ink: '#1B1B1F' },
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

for (const course of courses) {
  const p = palettes[course.categories[0]] ?? palettes.jlpt;
  const isLatin = /^[A-Z0-9]+$/.test(course.glyph);
  const size = isLatin ? 120 : course.glyph.length > 1 ? 104 : 140;
  const font = isLatin
    ? "'Inter', 'Segoe UI', Arial, sans-serif"
    : "'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', 'YuMincho', 'MS Mincho', serif";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400" role="img" aria-label="${esc(course.title.en)}">
  <!-- PLACEHOLDER course artwork (${course.id}). Replace with final image of the same name. -->
  <defs>
    <pattern id="w" width="40" height="20" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${p.ink}" stroke-opacity="0.06" stroke-width="1">
        <path d="M0 20a20 20 0 0 1 40 0M6 20a14 14 0 0 1 28 0M12 20a8 8 0 0 1 16 0"/>
        <path d="M-20 10a20 20 0 0 1 40 0M20 10a20 20 0 0 1 40 0"/>
      </g>
    </pattern>
  </defs>
  <rect width="640" height="400" fill="${p.bg}"/>
  <rect width="640" height="400" fill="url(#w)"/>
  <circle cx="320" cy="200" r="122" fill="none" stroke="${p.ring}" stroke-opacity="0.35" stroke-width="2"/>
  <circle cx="320" cy="200" r="104" fill="#FFFFFF" fill-opacity="0.7"/>
  <circle cx="452" cy="104" r="16" fill="#C8312B" fill-opacity="0.9"/>
  <text x="320" y="200" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-size="${size}" font-weight="${isLatin ? 700 : 600}" fill="${p.ink}" ${isLatin ? 'letter-spacing="-4"' : ''}>${esc(course.glyph)}</text>
</svg>
`;
  await writeFile(new URL(`${course.id}.svg`, outDir), svg);
}
console.log(`Generated ${courses.length} course placeholder images.`);
