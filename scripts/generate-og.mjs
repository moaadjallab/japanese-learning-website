// Generates the PLACEHOLDER social preview image (public/og/default.png, 1200×630)
// and the Apple touch icon (public/apple-touch-icon.png, 180×180) from original SVG artwork.
// Re-run after changing the brand name: pnpm og:generate
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BRAND = 'Nihongo Academy'; // keep in sync with src/config/site.ts
const TAGLINE = 'Learn Japanese Online · Beginner to JLPT N1';

const petal = 'M0 0c-6-6-7-15-2-20l2 3 2-3c5 5 4 14-2 20z';
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="w" width="60" height="30" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#1B1B1F" stroke-opacity="0.05" stroke-width="1.2">
        <path d="M0 30a30 30 0 0 1 60 0M9 30a21 21 0 0 1 42 0M18 30a12 12 0 0 1 24 0"/>
        <path d="M-30 15a30 30 0 0 1 60 0M30 15a30 30 0 0 1 60 0"/>
      </g>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="#FAF8F5"/>
  <rect width="1200" height="630" fill="url(#w)"/>
  <circle cx="1000" cy="300" r="170" fill="#C8312B"/>
  <g fill="#1B1B1F" transform="translate(1000 300) scale(0.8) translate(-900 -300)">
    <path d="M700 230 Q900 200 1100 230 L1106 254 Q900 226 694 254 Z"/>
    <rect x="722" y="268" width="356" height="16" rx="3"/>
    <rect x="764" y="244" width="22" height="330" rx="4"/>
    <rect x="1014" y="244" width="22" height="330" rx="4"/>
  </g>
  <g fill="#E8A6B4">
    <path transform="translate(640 120) rotate(-20) scale(1.6)" d="${petal}"/>
    <path transform="translate(1120 520) rotate(30) scale(1.3)" d="${petal}"/>
    <path transform="translate(600 520) rotate(60) scale(1.1)" d="${petal}"/>
  </g>
  <text x="80" y="210" font-family="'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP',serif" font-size="44" fill="#C8312B" letter-spacing="14">日本語</text>
  <text x="80" y="310" font-family="Inter,'Segoe UI',Arial,sans-serif" font-size="68" font-weight="700" fill="#1B1B1F">${BRAND}</text>
  <text x="80" y="380" font-family="Inter,'Segoe UI',Arial,sans-serif" font-size="32" fill="#5F5A52">${TAGLINE}</text>
  <rect x="80" y="430" width="120" height="6" rx="3" fill="#C8312B"/>
</svg>`;

await mkdir(new URL('../public/og/', import.meta.url), { recursive: true });
await sharp(Buffer.from(og))
  .png({ compressionLevel: 9 })
  .toFile(fileURLToPath(new URL('../public/og/default.png', import.meta.url)));

const favicon = await readFile(new URL('../public/favicon.svg', import.meta.url));
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="#FAF8F5"/></svg>`;
const mark = await sharp(favicon, { density: 600 }).resize(132, 132).png().toBuffer();
await sharp(Buffer.from(iconSvg))
  .composite([{ input: mark, top: 24, left: 24 }])
  .png()
  .toFile(fileURLToPath(new URL('../public/apple-touch-icon.png', import.meta.url)));

console.log('Generated public/og/default.png and public/apple-touch-icon.png');
