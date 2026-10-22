// Dev helper: list elements wider than the viewport. Usage: node scripts/find-overflow.mjs <url> [width]
import { chromium } from '@playwright/test';
const [url, width = '360'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 } });
await page.goto(url, { waitUntil: 'networkidle' });
const out = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const res = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && r.width > 0) {
      // Skip descendants of horizontally scrollable containers.
      let p = el.parentElement,
        scroller = false;
      while (p) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') {
          scroller = true;
          break;
        }
        p = p.parentElement;
      }
      if (!scroller)
        res.push(
          `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} L${Math.round(r.left)} R${Math.round(r.right)}`,
        );
    }
  }
  return { vw, sw: document.documentElement.scrollWidth, res: res.slice(0, 15) };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
