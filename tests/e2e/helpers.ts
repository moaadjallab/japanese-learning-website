import type { Page } from '@playwright/test';

/** Navigate and wait until every React island has hydrated (Astro removes the `ssr` attribute). */
export const gotoHydrated = async (page: Page, url: string) => {
  await page.goto(url);
  await page.waitForFunction(() => document.querySelectorAll('astro-island[ssr]').length === 0);
};
