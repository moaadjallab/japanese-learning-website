/**
 * Account flows against the local D1 database (applied by the Playwright webServer command).
 * Each run uses a fresh email address.
 */
import { expect, test } from '@playwright/test';

const unique = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@nihongo.test`;
const PASSWORD = 'sakura2026';

test.describe('accounts', () => {
  test('register → account page → logout → login', async ({ page }) => {
    const email = unique();

    // Register (Arabic UI).
    await page.goto('/ar/register/');
    const form = page.getByTestId('register-form');
    await form.getByLabel('الاسم الكامل').fill('طالب تجريبي');
    await form.getByLabel('البريد الإلكتروني').fill(email);
    await form.getByLabel(/^كلمة المرور/).fill(PASSWORD);
    await form.getByLabel('تأكيد كلمة المرور').fill(PASSWORD);
    await form.getByLabel('مستوى اللغة اليابانية').selectOption('n5');
    await form.getByRole('button', { name: 'إنشاء حساب' }).click();

    // Lands on the account page, signed in.
    await expect(page).toHaveURL(/\/ar\/account\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('طالب تجريبي');
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText('غير مؤكَّد بعد')).toBeVisible();

    // Static pages show "My account" in the header once signed in.
    await page.goto('/ar/pricing/');
    await expect(page.locator('header').getByRole('link', { name: 'حسابي' }).first()).toBeVisible();

    // Log out (plain form post, works without JavaScript).
    await page.goto('/ar/account/');
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    await expect(page).toHaveURL(/\/ar\/$/);
    await page.goto('/ar/account/');
    await expect(page).toHaveURL(/\/ar\/login\/\?next=/);

    // Wrong password → generic error; right password → back to the requested page.
    const login = page.getByTestId('login-form');
    await login.getByLabel('البريد الإلكتروني').fill(email);
    await login.getByLabel(/^كلمة المرور/).fill('wrongpass1');
    await login.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(login.getByRole('alert')).toContainText('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    await login.getByLabel(/^كلمة المرور/).fill(PASSWORD);
    await login.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(page).toHaveURL(/\/ar\/account\/$/);
  });

  test('duplicate email is rejected with a clear message', async ({ page, request }) => {
    const email = unique();
    const body = {
      fullName: 'First User',
      email,
      password: PASSWORD,
      confirmPassword: PASSWORD,
      preferredLanguage: 'en',
      japaneseLevel: 'beginner',
    };
    expect((await request.post('/api/auth/register', { data: body })).status()).toBe(200);

    await page.goto('/en/register/');
    const form = page.getByTestId('register-form');
    await form.getByLabel('Full Name').fill('Second User');
    await form.getByLabel('Email').fill(email);
    await form.getByLabel(/^Password/).fill(PASSWORD);
    await form.getByLabel('Confirm Password').fill(PASSWORD);
    await form.getByLabel('Japanese Level').selectOption('n4');
    await form.getByRole('button', { name: 'Create Account' }).click();
    await expect(form.getByRole('alert')).toContainText('An account already exists');
  });

  test('forgot password never reveals whether an account exists', async ({ page }) => {
    await page.goto('/en/forgot-password/');
    const form = page.getByTestId('forgot-form');
    await form.getByLabel('Email').fill('nobody-here@nihongo.test');
    await form.getByRole('button', { name: 'Send reset link' }).click();
    await expect(form.getByRole('status')).toContainText('If an account exists');
  });

  test('reset link without a valid token is refused', async ({ page }) => {
    await page.goto('/en/reset-password/?token=invalid-token-value-0123456789');
    const form = page.getByTestId('reset-form');
    await form.getByLabel(/^New password/).fill('another2026');
    await form.getByLabel('Confirm new password').fill('another2026');
    await form.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByText('This link is invalid or has expired.')).toBeVisible();
    // The token is removed from the address bar.
    await expect(page).toHaveURL(/\/en\/reset-password\/$/);
  });

  test('session API and account page require a valid session', async ({ request }) => {
    const res = await request.get('/api/auth/session');
    expect((await res.json()).session).toBeNull();
    const page = await request.get('/en/account/', { maxRedirects: 0 });
    expect(page.status()).toBe(302);
    expect(page.headers().location).toContain('/en/login/?next=');
  });
});
