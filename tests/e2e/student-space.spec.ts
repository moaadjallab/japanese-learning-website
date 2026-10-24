/**
 * Student space end to end: a new student has no plan → an admin activates Premium →
 * the student starts a course, completes a lesson, and sees a scheduled live class.
 * Uses the throwaway admin created by playwright.config.ts (local database only).
 */
import { gotoHydrated } from './helpers';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const PASSWORD = 'sakura2026';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

const login = async (page: Page, email: string, password: string, lang = 'en') => {
  await gotoHydrated(page, `/${lang}/login/`);
  const form = page.getByTestId('login-form');
  await form.getByLabel(lang === 'en' ? 'Email' : 'البريد الإلكتروني').fill(email);
  await form.getByLabel(lang === 'en' ? /^Password/ : /^كلمة المرور/).fill(password);
  await form.getByRole('button', { name: lang === 'en' ? 'Login' : 'تسجيل الدخول' }).click();
  await expect(page).toHaveURL(new RegExp(`/${lang}/dashboard/$`));
};

const register = async (request: APIRequestContext, email: string) => {
  const res = await request.post('/api/auth/register', {
    data: {
      fullName: 'Student Space',
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      preferredLanguage: 'en',
      japaneseLevel: 'beginner',
    },
  });
  expect(res.status()).toBe(200);
};

test('no plan → admin activates Premium → course, lesson progress and live class', async ({
  browser,
  request,
}) => {
  const email = `space-${Date.now()}@nihongo.test`;
  await register(request, email);

  // 1. Student without a plan: locked courses and a "choose a plan" prompt.
  const student = await (await browser.newContext()).newPage();
  await login(student, email, PASSWORD);
  await expect(student.getByText('No active subscription')).toBeVisible();
  await student.goto('/en/dashboard/courses/');
  await expect(student.getByRole('heading', { name: 'Not included in your plan' })).toBeVisible();
  await student.goto('/en/dashboard/courses/hiragana-katakana/');
  await expect(student).toHaveURL(/\/en\/dashboard\/courses\/$/);

  // 2. Admin activates Premium for one month and schedules a live class.
  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
  await admin.goto(`/en/admin/?q=${encodeURIComponent(email)}`);
  const row = admin.locator(`[data-testid="admin-user-row"][data-email="${email}"]`);
  await row.getByLabel('Plan').selectOption('premium');
  await row.getByRole('button', { name: 'Activate' }).click();
  await expect(admin.getByRole('status')).toHaveText('Plan activated.');

  const title = `E2E class ${Date.now()}`;
  await admin.getByLabel('Title (English)').fill(title);
  await admin.getByLabel('Title (Arabic)').fill('حصة تجريبية');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
  await admin.getByLabel('Date and time (your time zone)').fill(local);
  await admin.getByLabel('Meeting link (https://…)').fill('https://meet.example.com/e2e');
  await admin.getByRole('button', { name: 'Schedule' }).click();
  await expect(admin.getByRole('status')).toHaveText('Class scheduled.');

  // 3. Student now has Premium: start a course, complete a lesson.
  await student.goto('/en/dashboard/');
  await expect(student.getByTestId('active-plan')).toHaveText('Premium plan');
  await student.goto('/en/dashboard/courses/');
  const card = student.locator('li', { has: student.getByRole('heading', { name: 'Hiragana & Katakana' }) });
  await card.getByRole('button', { name: 'Start course' }).click();
  await expect(student).toHaveURL(/\/dashboard\/courses\/hiragana-katakana\/$/);
  await student.getByRole('link', { name: 'Start course' }).click();
  await expect(student.getByRole('heading', { level: 1 })).toHaveText('The three Japanese writing systems');
  await expect(student.getByRole('cell', { name: 'ひらがな' })).toBeVisible();
  await student.getByRole('button', { name: 'Mark as completed' }).click();
  await expect(student.getByRole('button', { name: 'Mark as not completed' })).toBeVisible();
  await student.getByRole('link', { name: 'Back to the course' }).click();
  await expect(student.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '13');

  // 4. The scheduled live class is joinable with Premium.
  await student.goto('/en/dashboard/live/');
  const item = student.getByTestId('live-list').locator('li', { hasText: title });
  await expect(item.getByRole('link', { name: /Join the class/ })).toHaveAttribute(
    'href',
    'https://meet.example.com/e2e',
  );

  // 5. Students cannot open the admin page.
  await student.goto('/en/admin/');
  await expect(student).toHaveURL(/\/en\/dashboard\/$/);
});

test('admin tools: overview, user page, roles, verify email, suspend/restore, CSV export', async ({
  browser,
  request,
}) => {
  const email = `tools-${Date.now()}@nihongo.test`;
  await register(request, email);
  const student = await (await browser.newContext()).newPage();
  await login(student, email, PASSWORD);

  const admin = await (await browser.newContext()).newPage();
  await login(admin, ADMIN_EMAIL, ADMIN_PASSWORD);
  await admin.goto(`/en/admin/?q=${encodeURIComponent(email)}`);
  await expect(admin.getByTestId('admin-stat')).toHaveCount(6);

  // Open the student's page from the list.
  const row = admin.locator(`[data-testid="admin-user-row"][data-email="${email}"]`);
  await row.getByRole('link', { name: 'Details' }).click();
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Student Space');
  await expect(admin.getByText('Not verified')).toBeVisible();

  // Make them a teacher, verify the email manually.
  await admin.getByRole('checkbox', { name: 'Teacher' }).check();
  await admin.getByRole('button', { name: 'Save roles' }).click();
  await expect(admin.getByRole('status')).toHaveText('Roles updated.');
  await expect(admin.getByRole('checkbox', { name: 'Teacher' })).toBeChecked();
  await admin.getByRole('button', { name: 'Mark email as verified' }).click();
  await expect(admin.getByRole('status')).toHaveText('Email marked as verified.');
  await expect(admin.getByText('Verified', { exact: true })).toBeVisible();

  // Suspend: the student is signed out at once and can no longer sign in.
  admin.once('dialog', (dialog) => dialog.accept());
  await admin.getByRole('button', { name: 'Suspend account' }).click();
  await expect(admin.getByRole('status')).toHaveText('Account suspended and signed out everywhere.');
  await student.goto('/en/dashboard/');
  await expect(student).toHaveURL(/\/en\/login\//);
  const denied = await request.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(denied.status()).toBe(401);

  // It shows under the "Suspended" filter, then gets restored.
  await admin.goto('/en/admin/?filter=suspended');
  await expect(admin.locator(`[data-testid="admin-user-row"][data-email="${email}"]`)).toBeVisible();
  await admin.goto(`/en/admin/?q=${encodeURIComponent(email)}&filter=suspended`);
  await admin.getByRole('link', { name: 'Details' }).click();
  await admin.getByRole('button', { name: 'Restore account' }).click();
  await expect(admin.getByRole('status')).toHaveText('Account restored.');
  const allowed = await request.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(allowed.status()).toBe(200);

  // CSV export (admin session cookies).
  const csv = await admin.request.get('/api/admin/export');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain(`"${email}"`);
});

test('admin API refuses non-admins', async ({ request }) => {
  const res = await request.post('/api/admin/subscription', {
    form: { userId: 'x', plan: 'private', months: '12' },
  });
  expect(res.status()).toBe(403);
  expect((await request.get('/api/admin/export')).status()).toBe(403);
  expect((await request.post('/api/admin/suspend', { form: { userId: 'x' } })).status()).toBe(403);
});
