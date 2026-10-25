/**
 * Course editor end to end: an admin creates a course → it appears in the public catalog and on
 * its own page (EN + AR) → edit → hide → delete. Only a course created by the test is touched,
 * so tests running in parallel keep seeing the 14 built-in courses unchanged.
 */
import { gotoHydrated } from './helpers';
import { expect, test, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD!;

const loginAdmin = async (page: Page) => {
  await gotoHydrated(page, '/en/login/');
  const form = page.getByTestId('login-form');
  await form.getByLabel('Email').fill(ADMIN_EMAIL);
  await form.getByLabel(/^Password/).fill(ADMIN_PASSWORD);
  await form.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/$/);
};

test('admin creates, edits, hides and deletes a course', async ({ browser }) => {
  const slug = `e2e-course-${Date.now()}`;
  const admin = await (await browser.newContext()).newPage();
  const visitor = await (await browser.newContext()).newPage();
  await loginAdmin(admin);

  // Create.
  await admin.goto('/en/admin/courses/');
  await expect(admin.getByTestId('admin-course-row')).toHaveCount(14);
  await admin.getByRole('link', { name: 'New course' }).click();
  await admin.getByLabel('Web address (identifier)').fill(slug);
  await admin.getByRole('checkbox', { name: 'Beginner' }).check();
  await admin.getByRole('checkbox', { name: 'Vocabulary' }).check();
  await admin.getByLabel('Japanese characters on the card').fill('子供');
  await admin.getByLabel('Title (English)').fill('Japanese for Kids');
  await admin.getByLabel('Title (العربية)').fill('اليابانية للأطفال');
  await admin.getByLabel('Short description (English)').fill('Playful first steps in Japanese.');
  await admin.getByLabel('Short description (العربية)').fill('خطوات أولى ممتعة في اليابانية.');
  await admin.getByLabel('Overview (English)').fill('Songs, games and kana for young learners.');
  await admin.getByLabel('Overview (العربية)').fill('أغانٍ وألعاب وكانا للمتعلّمين الصغار.');
  await admin.getByLabel('What students will learn (English)').fill('Read hiragana\nCount to ten');
  await admin.getByLabel('What students will learn (العربية)').fill('قراءة الهيراغانا\nالعدّ حتى عشرة');
  await admin.getByLabel('Japanese', { exact: true }).fill('こども');
  await admin.getByLabel('Romaji').fill('kodomo');
  await admin.getByLabel('Meaning (English)').fill('child');
  await admin.getByLabel('Meaning (العربية)').fill('طفل');
  await admin.getByRole('checkbox', { name: 'Hidden (not shown on the website)' }).uncheck();
  await admin.getByRole('button', { name: 'Create the course' }).click();
  await expect(admin.getByRole('status')).toHaveText('Course created.');
  await expect(admin).toHaveURL(new RegExp(`/en/admin/courses/${slug}/`));

  // Visible on the public site, in both languages.
  await gotoHydrated(visitor, '/en/courses/');
  await expect(visitor.getByRole('heading', { name: 'Japanese for Kids' })).toBeVisible();
  await visitor.goto(`/en/courses/${slug}/`);
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Japanese for Kids');
  await expect(visitor.getByText('Count to ten')).toBeVisible();
  await visitor.goto(`/ar/courses/${slug}/`);
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('اليابانية للأطفال');

  // Edit.
  await admin.getByLabel('Title (English)').fill('Japanese for Children');
  await admin.getByRole('button', { name: 'Save changes' }).click();
  await expect(admin.getByRole('status')).toHaveText('Changes saved.');
  await visitor.goto(`/en/courses/${slug}/`);
  await expect(visitor.getByRole('heading', { level: 1 })).toHaveText('Japanese for Children');

  // Hide: gone from the site (detail redirects to the catalog), still listed in the admin.
  await admin.getByRole('button', { name: 'Hide' }).click();
  await expect(admin.getByRole('status')).toHaveText('Course hidden.');
  await visitor.goto(`/en/courses/${slug}/`);
  await expect(visitor).toHaveURL(/\/en\/courses\/$/);
  await expect(visitor.getByRole('heading', { name: 'Japanese for Children' })).toHaveCount(0);

  // Delete (a created course is removed for good).
  admin.once('dialog', (dialog) => dialog.accept());
  await admin.getByRole('button', { name: 'Delete' }).click();
  await expect(admin.getByRole('status')).toHaveText('Course deleted.');
  await expect(admin.locator(`[data-testid="admin-course-row"][data-slug="${slug}"]`)).toHaveCount(0);
});

test('course editor API refuses non-admins', async ({ request }) => {
  const res = await request.post('/api/admin/course-delete', { form: { slug: 'kanji' } });
  expect(res.status()).toBe(403);
});
