import { expect, test } from '@playwright/test';

test.describe('i18n & layout', () => {
  for (const [lang, dir, title] of [
    ['en', 'ltr', 'Learn Japanese Online'],
    ['ar', 'rtl', 'تعلّم اللغة اليابانية عبر الإنترنت'],
  ] as const) {
    test(`home loads in ${lang} with correct lang/dir`, async ({ page }) => {
      const response = await page.goto(`/${lang}/`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
      await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveCount(1);
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/${lang}/$`));
    });
  }

  test('root redirects according to Accept-Language', async ({ browser }) => {
    const ar = await browser.newContext({
      locale: 'ar-MA',
      extraHTTPHeaders: { 'Accept-Language': 'ar-MA,ar;q=0.9' },
    });
    const page = await ar.newPage();
    await page.goto('/');
    await expect(page).toHaveURL(/\/ar\/$/);
    await ar.close();

    const fr = await browser.newContext({ extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9' } });
    const page2 = await fr.newPage();
    await page2.goto('/');
    await expect(page2).toHaveURL(/\/en\/$/);
    await fr.close();
  });

  test('language switcher keeps the equivalent page', async ({ page }) => {
    await page.goto('/en/pricing/');
    await page
      .locator('header')
      .getByRole('link', { name: /العربية/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/ar\/pricing\/$/);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('mobile menu: aria-expanded, Escape closes and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/ar/');
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#mobile-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await expect(toggle).toBeFocused();
  });

  test('localized 404', async ({ page }) => {
    const response = await page.goto('/ar/this-page-does-not-exist/');
    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });
});

test.describe('course catalog', () => {
  test('filters by level, syncs the URL and shows an empty state', async ({ page }) => {
    await page.goto('/en/courses/');
    const count = page.getByTestId('result-count');
    await expect(count).toHaveText('14 courses');

    await page.getByLabel('Level').selectOption('n1');
    await expect(page).toHaveURL(/level=n1/);
    await expect(count).not.toHaveText('14 courses');
    const n1Cards = await page.getByTestId('course-results').locator('article').count();
    expect(n1Cards).toBeGreaterThan(0);
    expect(n1Cards).toBeLessThan(14);

    // Language switcher carries the filters.
    await expect(page.locator('header a[data-lang-switch="ar"]').first()).toHaveAttribute('href', /level=n1/);

    await page.getByLabel('Search courses').fill('zzzz-no-match');
    await expect(page.getByTestId('course-empty')).toBeVisible();
    await page.getByTestId('course-empty').getByRole('button').click();
    await expect(count).toHaveText('14 courses');
    await expect(page).toHaveURL(/\/en\/courses\/$/);
  });

  test('applies filters from the URL (Arabic)', async ({ page }) => {
    await page.goto('/ar/courses/?category=travel');
    await expect(page.getByLabel('الفئة')).toHaveValue('travel');
    await expect(page.getByTestId('course-results').locator('article')).toHaveCount(1);
  });

  test('course detail page has Course JSON-LD and a subscribe CTA', async ({ page }) => {
    await page.goto('/en/courses/kanji/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kanji');
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.some((json) => JSON.parse(json)['@type'] === 'Course')).toBe(true);
    expect(ld.join('')).not.toMatch(/AggregateRating|"Review"/);
    await expect(page.getByRole('link', { name: 'Subscribe Now' }).first()).toHaveAttribute(
      'href',
      /checkout\/\?plan=/,
    );
  });
});

test.describe('forms', () => {
  test('contact form validates and never fakes success', async ({ page }) => {
    await page.goto('/en/contact/');
    const form = page.getByTestId('contact-form');
    await form.getByRole('button', { name: 'Send Message' }).click();

    const name = form.getByLabel('Name');
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toBeFocused();
    const describedBy = await name.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    await expect(page.locator(`#${describedBy}`)).toHaveText('This field is required.');
    await expect(form.getByRole('alert')).toBeVisible();

    await name.fill('Test User');
    await form.getByLabel('Email').fill('test@example.com');
    await form.getByLabel('Subject').fill('Question');
    await form.getByLabel('Message').fill('Hello, this is a test message.');
    await expect(name).not.toHaveAttribute('aria-invalid', 'true');
    await form.getByRole('button', { name: 'Send Message' }).click();
    // Without Turnstile/Resend configured, production answers 503 → friendly error, no fake success.
    await expect(form.getByRole('alert')).toContainText(/unavailable|went wrong/i);
  });

  test('register validates all fields (accessible errors, password toggle)', async ({ page }) => {
    await page.goto('/en/register/');
    const form = page.getByTestId('register-form');
    await form.getByRole('button', { name: 'Create Account' }).click();
    await expect(form.getByLabel('Full Name')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Japanese Level')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByLabel('Full Name')).toBeFocused();

    await form.getByLabel('Full Name').fill('Test User');
    await form.getByLabel('Email').fill('test@example.com');
    await form.getByLabel('Japanese Level').selectOption('unknown');
    await form.getByLabel(/^Password/).fill('sakura2026');
    const toggle = form.getByRole('button', { name: 'Show password' }).first();
    await toggle.click();
    await expect(form.getByLabel(/^Password/)).toHaveAttribute('type', 'text');
    await form.getByLabel('Confirm Password').fill('different1');
    await expect(form.getByLabel('Confirm Password')).toHaveAttribute('aria-invalid', 'true');
  });
});

test.describe('checkout', () => {
  test('confirm shows "payments being activated" and never reaches success', async ({ page }) => {
    await page.goto('/en/checkout/?plan=premium');
    await expect(page.getByRole('heading', { name: 'Premium' })).toBeVisible();
    await expect(page.getByText('Monthly').first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirm Subscription' }).click();
    await expect(page.getByTestId('payments-coming-soon')).toBeVisible();
    await expect(page).not.toHaveURL(/success/);
  });

  test('success page is locked without a verified payment', async ({ page }) => {
    await page.goto('/ar/checkout/success/?session_id=fake');
    await expect(page).toHaveURL(/\/ar\/pricing\/$/);
  });

  test('missing plan asks the visitor to choose one', async ({ page }) => {
    await page.goto('/en/checkout/?plan=gold');
    await expect(page.getByRole('heading', { name: 'Choose a plan first' })).toBeVisible();
  });
});

test.describe('APIs', () => {
  test('payment stubs return a structured 501', async ({ request }) => {
    const res = await request.post('/api/payments/checkout-session', { data: {} });
    expect(res.status()).toBe(501);
    expect((await res.json()).error.code).toBe('not_implemented');
  });
});
