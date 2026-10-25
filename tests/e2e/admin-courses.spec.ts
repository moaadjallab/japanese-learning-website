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

  // Lessons: add one with a YouTube link (converted) and vocabulary, then see it as a student.
  const courseEditor = admin.url();
  await admin.getByRole('link', { name: 'Add a lesson' }).click();
  await admin.getByLabel('Web address (identifier)').fill('greetings');
  await admin.getByLabel('Duration (minutes)').fill('12');
  await admin.getByLabel('Video link (optional)').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  await admin.getByLabel('Title (English)').fill('Greetings');
  await admin.getByLabel('Title (العربية)').fill('التحيات');
  await admin.getByLabel('Lesson text (English)').fill('Say hello and thank you.');
  await admin.getByLabel('Lesson text (العربية)').fill('قل مرحبًا وشكرًا.');
  await admin
    .getByRole('textbox', { name: 'Vocabulary' })
    .fill('こんにちは | konnichiwa | hello | مرحبًا\nありがとう | arigatō | thank you | شكرًا');
  await admin.getByRole('checkbox', { name: 'Hidden (not shown to students)' }).uncheck();
  await admin.getByRole('button', { name: 'Add the lesson' }).click();
  await expect(admin.getByRole('status')).toHaveText('Lesson added.');
  await expect(admin.getByLabel('Video link (optional)')).toHaveValue(
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );

  // The admin gives themself the Private plan to open the course as a student.
  await admin.goto(`/en/admin/?q=${encodeURIComponent(ADMIN_EMAIL)}`);
  const me = admin.locator(`[data-testid="admin-user-row"][data-email="${ADMIN_EMAIL}"]`);
  await me.getByLabel('Plan').selectOption('private');
  await me.getByRole('button', { name: 'Activate' }).click();
  await admin.goto(`/en/dashboard/courses/${slug}/greetings/`);
  await expect(admin.getByRole('heading', { level: 1 })).toHaveText('Greetings');
  await expect(admin.locator('iframe')).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
  );
  await expect(admin.getByRole('cell', { name: 'ありがとう' })).toBeVisible();

  // Hide the lesson: students no longer see it; then delete it.
  await admin.goto(courseEditor);
  const row = admin.locator('[data-testid="admin-lesson-row"][data-slug="greetings"]');
  await row.getByRole('button', { name: 'Hide' }).click();
  await expect(admin.getByRole('status')).toHaveText('Lesson hidden from students.');
  await admin.goto(`/en/dashboard/courses/${slug}/`);
  await expect(admin.getByText('Lessons for this course are being prepared')).toBeVisible();
  await admin.goto(courseEditor);
  admin.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Delete' }).click();
  await expect(admin.getByRole('status')).toHaveText('Lesson deleted.');
  await expect(row).toHaveCount(0);

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
