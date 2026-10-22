// Dev helper: full-page screenshot of a URL.
// Usage: node scripts/shot.mjs <url> <out.png> [width=1280]
import { chromium } from '@playwright/test';

const [url, out, width = '1280'] = process.argv.slice(2);
if (!url || !out) {
  console.error('Usage: node scripts/shot.mjs <url> <out.png> [width]');
  process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
page.on('console', (msg) => msg.type() === 'error' && console.log('[console]', msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('saved', out);
