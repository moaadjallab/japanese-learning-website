/** Automated WCAG 2.x A/AA checks with axe-core on key pages in both languages. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = [
  '/',
  '/courses/',
  '/courses/kanji/',
  '/pricing/',
  '/about/',
  '/faq/',
  '/contact/',
  '/register/',
  '/checkout/?plan=basic',
];

for (const lang of ['en', 'ar'] as const) {
  for (const path of PAGES) {
    test(`a11y ${lang}${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(`/${lang}${path}`);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        serious.map(
          (v) =>
            `${v.id}: ${v.help} → ${v.nodes
              .map((n) => n.target.join(' '))
              .slice(0, 3)
              .join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }
}
