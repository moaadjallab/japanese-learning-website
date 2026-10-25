/**
 * Playwright runs against the PRODUCTION build served by `wrangler dev` (same runtime as Cloudflare).
 * Run `pnpm build` first.
 *   pnpm test:e2e      → smoke + accessibility tests (chromium)
 *   pnpm screenshots   → responsive screenshots for both languages into /screenshots
 */
import { randomBytes } from 'node:crypto';
import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const E2E_STATE = '.wrangler/e2e-state';

// Throwaway admin for the student-space tests, created in the LOCAL database before the server
// starts. The password is random per run (and shared with the tests through process.env).
process.env.E2E_ADMIN_EMAIL ??= 'e2e-admin@nihongo.test';
process.env.E2E_ADMIN_PASSWORD ??= `E2e-${randomBytes(12).toString('base64url')}1`;

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
    // Apply D1 migrations to the local database first (accounts tests need the tables).
    // Tests use their own local database (.wrangler/e2e-state), separate from `pnpm dev` data.
    command: `pnpm exec wrangler d1 migrations apply DB --local --persist-to ${E2E_STATE} && node scripts/seed-admin.mjs && pnpm exec wrangler dev --port ${PORT} --ip 127.0.0.1 --persist-to ${E2E_STATE}`,
    env: {
      SEED_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL,
      SEED_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
      SEED_PERSIST_TO: E2E_STATE,
    },
    url: `${BASE_URL}/en/`,
    // Always start fresh so the e2e admin above exists with this run's password.
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /(screenshots|admin-courses)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
    {
      // Creates a public course for a moment: runs after the others so they keep seeing 14 courses.
      name: 'admin-courses',
      testMatch: /admin-courses\.spec\.ts/,
      dependencies: ['chromium', 'screenshots'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
