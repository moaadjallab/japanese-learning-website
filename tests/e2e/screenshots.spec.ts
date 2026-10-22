/**
 * Responsive / RTL visual QA. Saves full-page screenshots to /screenshots/<lang>/<page>-<width>.png
 * and fails if any page scrolls horizontally (a common RTL / responsive bug).
 * Run: pnpm build && pnpm screenshots
 */
import { expect, test } from '@playwright/test';

const WIDTHS = [360, 390, 768, 1024, 1280, 1536];
const PAGES: [string, string][] = [
  ['home', '/'],
  ['courses', '/courses/'],
  ['course-detail', '/courses/japanese-n5/'],
  ['pricing', '/pricing/'],
  ['contact', '/contact/'],
  ['checkout', '/checkout/?plan=premium'],
];

for (const lang of ['en', 'ar'] as const) {
  for (const [name, path] of PAGES) {
    test(`${lang} ${name}`, async ({ page }) => {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${lang}${path}`, { waitUntil: 'networkidle' });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);
        await page.screenshot({ path: `screenshots/${lang}/${name}-${width}.png`, fullPage: true });
      }
    });
  }
}
