/**
 * Playwright runs against the PRODUCTION build served by `wrangler dev` (same runtime as Cloudflare).
 * Run `pnpm build` first.
 *   pnpm test:e2e      → smoke + accessibility tests (chromium)
 *   pnpm screenshots   → responsive screenshots for both languages into /screenshots
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1`,
    url: `${BASE_URL}/en/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
  ],
});
