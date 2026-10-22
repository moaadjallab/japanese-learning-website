// Dev helper: full-page screenshot of a URL.
// Usage: node scripts/shot.mjs <url> <out.png> [width=1280] [segmentHeight]
// With segmentHeight, also writes <out>-0.png, <out>-1.png, ... (easier to inspect long pages).
import { chromium } from '@playwright/test';

const [url, out, width = '1280', segment] = process.argv.slice(2);
if (!url || !out) {
  console.error('Usage: node scripts/shot.mjs <url> <out.png> [width]');
  process.exit(1);
}
const browser = await chromium.launch();
// Reduced motion: scroll-driven reveal animations would otherwise hide content in full-page captures.
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, reducedMotion: 'reduce' });
page.on('console', (msg) => msg.type() === 'error' && console.log('[console]', msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: true });
if (segment) {
  const h = Number(segment);
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let i = 0, y = 0; y < total; i++, y += h) {
    await page.screenshot({
      path: out.replace(/\.png$/, `-${i}.png`),
      fullPage: true,
      clip: { x: 0, y, width: Number(width), height: Math.min(h, total - y) },
    });
  }
}
await browser.close();
console.log('saved', out);
