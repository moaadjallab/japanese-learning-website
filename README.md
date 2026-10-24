# Nihongo Academy — website (V1)

Bilingual (Arabic RTL / English LTR) marketing and subscription website for an online Japanese
language school. Single conversion goal: **Visitor → Subscription**.

> "Nihongo Academy" is a **placeholder brand**. Change it in one file: `src/config/site.ts`.

- **Stack:** Astro 5 (static pages + a few on-demand routes) · TypeScript strict · Tailwind CSS 4 ·
  React islands (catalog filters, forms) · Cloudflare Workers (static assets + Worker) · Zod · Vitest · Playwright
- **Pages (×2 languages):** Home, Courses (+14 course pages), Pricing, About, FAQ, Contact, Login, Register,
  Forgot password, Checkout, Payment success, 4 legal drafts, 404
- **Accounts:** real email + password accounts on Cloudflare D1 (register, login, logout, email verification,
  password reset, "My account" page, roles student/teacher/admin). See [AUTH_PLAN.md](AUTH_PLAN.md).
- **Student space** (`/[lang]/dashboard/`): plan status, my courses, lessons with key vocabulary and
  progress tracking, live-class schedule. **Admin page** (`/[lang]/admin/`): activate plans manually and
  schedule live classes.
- **Not built yet:** online payments (plans are activated manually by an admin), quizzes, certificates,
  teacher area. The architecture is ready for them (see `AUTH_PLAN.md`, `PAYMENTS_PLAN.md`).

Other docs: [DEPLOY.md](DEPLOY.md) · [AUTH_PLAN.md](AUTH_PLAN.md) · [PAYMENTS_PLAN.md](PAYMENTS_PLAN.md) ·
[PLACEHOLDERS.md](PLACEHOLDERS.md) · [DECISIONS.md](DECISIONS.md) · [SPEC.md](SPEC.md)

---

## Getting started

Requirements: Node.js ≥ 20.3 (22 recommended) and pnpm 10.

```bash
pnpm install
pnpm db:migrate:local   # create the local database tables (accounts)
pnpm db:seed:local      # optional: local admin test account (credentials written to .dev.vars)
pnpm dev                # http://localhost:4321 → redirects to /en/ or /ar/
```

Log in at `/en/login/` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.dev.vars`, or create a student
account at `/en/register/`. In dev, verification and reset emails are printed in the terminal.

Optional local secrets: copy `.env.example` to `.dev.vars` (used by the Cloudflare runtime in dev).
Without any secrets the contact form logs messages to the terminal instead of emailing them (dev only).

### Scripts

| Command                             | What it does                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Dev server (also regenerates the Japanese font subset).                                             |
| `pnpm build`                        | Font subset → `astro build` → `dist/_headers` with CSP hashes.                                      |
| `pnpm preview`                      | Build, then serve the production build with `wrangler dev` (real Workers runtime).                  |
| `pnpm lint` / `pnpm format`         | ESLint (incl. a11y rules) / Prettier.                                                               |
| `pnpm typecheck`                    | `astro check` (TypeScript + Astro templates).                                                       |
| `pnpm test`                         | Vitest unit tests (i18n, helpers, validation, content rules).                                       |
| `pnpm test:e2e`                     | Playwright smoke + axe accessibility tests (run `pnpm build` first).                                |
| `pnpm screenshots`                  | Responsive screenshots, 6 widths × 2 languages, into `/screenshots` (fails on horizontal overflow). |
| `pnpm db:migrate:local` / `:remote` | Apply `db/migrations/` to the local / production D1 database.                                       |
| `pnpm db:seed:local`                | Create or reset the local admin test account (never touches production).                            |
| `pnpm og:generate`                  | Regenerate the placeholder Open Graph image and Apple touch icon.                                   |
| `pnpm deploy`                       | Build and `wrangler deploy` (see DEPLOY.md).                                                        |

Dev-only pages: **`/en/_styleguide`** and `/ar/_styleguide` (component library; never built in production),
and `/en/checkout/success/?preview=1` (success page design preview).

---

## Project structure

```text
src/
  config/site.ts            ← brand name, tagline, logo, contact, legal entity (ONE place)
  config/navigation.ts      ← header/footer navigation
  i18n/en.ts, ar.ts         ← ALL UI strings (typed; ar must match en's shape)
  i18n/index.ts             ← t(), useTranslations(), plural(), negotiateLocale()
  content/                  ← content data (validated by src/content.config.ts)
    courses.json            ← 14 courses (en/ar text, levels, categories, Japanese example)
    plans.json              ← Basic / Premium / Private (price: null = "$XX")
    faqs.json               ← FAQ entries (+ which ones appear on the home page)
    testimonials.json       ← placeholder testimonials (replace with real, consented reviews)
    legal/<lang>/*.md       ← legal DRAFT templates
  lib/
    repositories/           ← data access (content collections today, D1 tomorrow)
    domain/types.ts         ← Course, Plan, Faq, level & category ids…
    catalog/filter.ts       ← search / filter / URL-sync logic (unit-tested)
    validation/schemas.ts   ← Zod schemas shared by browser and API
    auth/                   ← AuthService client, types (Role, User, Session), route guard;
                              server/ = D1 sessions, password hashing, auth emails
    learning/               ← student space: access rules, page loader, D1 queries (progress, live)
    admin/                  ← admin-only D1 queries (manual plans, live-class scheduling, users)
    payments/               ← PaymentProvider interface + adapters (no fake payments)
    email/                  ← EmailProvider (Resend adapter; console adapter in dev)
    security/               ← security headers/CSP, rate limiter, Turnstile
    seo/jsonld.ts           ← Organization, WebSite, Course, FAQPage, BreadcrumbList
  components/
    ui/                     ← Button, Card, Badge, Section, Container, Accordion, Tabs, form fields
    sections/               ← Header, Footer, LanguageSwitcher, Hero, Features, CourseGrid, …
    islands/                ← React: CourseExplorer, ContactForm, AuthForms
  layouts/                  ← BaseLayout (html lang/dir, SEO, fonts), AuthLayout
  pages/
    index.ts                ← "/" → /en/ or /ar/ (Accept-Language)
    [lang]/…                ← all localized pages
    api/contact.ts          ← working contact endpoint
    api/auth/[action].ts    ← 501 stubs
    api/payments/[action].ts← 501 stubs
  features/{dashboard,teacher,admin}/README.md ← V2 placeholders (not built)
db/migrations/0001_initial_schema.sql               ← D1 schema prepared for V2
scripts/                    ← font subsetting, OG image, CSP post-build, course artwork, dev helpers
tests/unit, tests/e2e       ← Vitest, Playwright
```

---

## How to edit common things

### Brand name, logo, contact details

Edit **`src/config/site.ts`** (name in both languages, tagline, emails, WhatsApp, Instagram, legal entity).
Replace the logo mark in `src/components/layout/LogoMark.astro`, `public/favicon.svg` and
`public/images/logo-mark.svg`, then run `pnpm og:generate` (update `BRAND` in `scripts/generate-og.mjs`).

### Prices

Edit **`src/content/plans.json`** → set `"price": 19` (number, in `currency`). While `price` is `null`
the site shows `$XX / month` (`XX$ / شهريًا` in Arabic). Features and the comparison table are in the
same file; comparison row labels are in `src/i18n/*.ts` → `pricingPage.comparison`.

### Courses

Edit **`src/content/courses.json`**. Each course has `levels`, `categories` (first = primary), `plans`,
localized `title`/`description`/`overview`/`outcomes`, and a Japanese `example` (with romaji).
Course pages, the catalog and the sitemap update automatically. Placeholder artwork:
`public/images/placeholders/courses/<slug>.svg` (regenerate with `node scripts/generate-course-images.mjs`,
or replace with real images of the same name).

### Translations / UI text

All UI strings live in **`src/i18n/en.ts`** and **`src/i18n/ar.ts`**. TypeScript enforces that Arabic has
exactly the same keys as English, and a unit test checks that `{placeholders}` match. Never hardcode text
in components; use `t('section.key')` or `getDictionary(lang)`.

### Lessons, live classes and student access

- **Lessons:** `src/content/lessons.json` (one entry per lesson: `course`, `order`, `type`, `durationMin`,
  `videoUrl`, localized `title`/`summary`, and key vocabulary `items`). Courses without lessons show
  "lessons are being prepared". Set `videoUrl` to an embed URL (YouTube no-cookie, Vimeo or Cloudflare
  Stream) to show the video.
- **Giving a student access:** sign in as admin → **Admin** tab → find the student → choose a plan and a
  number of months → **Activate**. Access rules: a course is open when the plan is listed in the course's
  `plans`; live classes need Premium (or Private for private sessions).
- **Live classes:** Admin tab → **Schedule a class** (time is entered in your time zone and shown to each
  student in theirs).

### FAQ, testimonials, legal pages

`src/content/faqs.json` (set `homeOrder` to show a question on the home page),
`src/content/testimonials.json` (set `placeholder: false` and fill `quote`, `name`, `country` — only with
real, consented reviews), `src/content/legal/<lang>/<doc>.md`.

### Finding placeholder content

Run `pnpm dev`: every placeholder element has a red dashed outline and a "PH · …" tag (dev only; nothing
is added in production). The full list is in [PLACEHOLDERS.md](PLACEHOLDERS.md).

---

## Promo video (Remotion)

`video/` is a separate Remotion project (its own `package.json`, not part of the site build) that renders a
32-second vertical promo (1080×1920, 30 fps) in English and Arabic (RTL). It reads its text from the
website's own content (`src/i18n`, `src/content/courses.json`, `src/content/plans.json`, `src/config/site.ts`),
so it stays in sync with the site and never shows prices or claims the site doesn't make.

```bash
cd video
pnpm install
pnpm studio      # preview and tweak in the browser
pnpm render      # → video/out/promo-en.mp4 and video/out/promo-ar.mp4
```

Scenes live in `video/src/scenes/Scenes.tsx` and the timing in `video/src/Promo.tsx`. Renders in `video/out/` are gitignored.

---

## Quality gates

- **CI** (`.github/workflows/ci.yml`): lint → typecheck → unit tests → build → Playwright smoke + axe.
- **Lighthouse (mobile, local production build, Oct 2026):** Home 100/100/100/100 (EN), 98/100/100/100 (AR);
  Courses 98 (EN), 95 (AR); Pricing 100 (EN), 98–99 (AR). Accessibility, Best Practices and SEO: 100 on all six.
- **Accessibility:** axe (WCAG 2.2 A/AA) passes with no serious/critical issues on 18 key pages; skip link,
  landmarks, focus states, accessible mobile menu (focus trap, Esc), native `<details>` accordions,
  labelled form errors (`aria-describedby`), `lang="ja"` on Japanese text, reduced-motion support.
