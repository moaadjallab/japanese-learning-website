# Decisions

Choices made while building V1, with the reasoning, so they can be revisited.

## Architecture

1. **Astro 5, static-first, Cloudflare Workers + static assets.** All marketing pages are prerendered.
   Only `/` (language negotiation), checkout, success, the 404 and `/api/*` run in the Worker
   (`prerender = false`). Astro 5 / adapter v12 were used as requested even though newer majors exist.
2. **`[lang]` dynamic routes + Astro i18n config** (`prefixDefaultLocale: true`, `redirectToDefaultLocale: false`).
   One page file serves both languages; `src/pages/index.ts` does the Accept-Language redirect (302 + `Vary`).
3. **Localized 404 rendered on demand.** Cloudflare passes unknown URLs to the Worker, which picks the
   language from the path (`/ar/...` → Arabic). A static 404 could not know the language.
4. **Checkout and success are on demand.** Checkout reads `?plan=` and the `CHECKOUT_URL_*` secrets at
   runtime and works without JavaScript; success can verify a payment server-side before rendering.
5. **Repository layer over content collections** (`src/lib/repositories/*`), domain types in
   `src/lib/domain/types.ts` with no Astro imports, so D1 can replace JSON files without touching components.
6. **React islands only where needed:** course catalog (`client:load`; `client:idle` was tried, but a
   filter chosen before hydration was lost), contact form, auth forms. Header menu and tabs are
   tiny vanilla scripts; accordions are native `<details>`.
7. **Security headers from one module** (`src/lib/security/headers.js`), used by the middleware (Worker
   responses) and `scripts/postbuild-csp.mjs` (writes `dist/_headers`). Inline scripts (Astro island
   bootstrap) are allowed by **SHA-256 hash**, not `'unsafe-inline'`. Inline _styles_ are allowed (no script
   risk; Astro inlines small styles). Turnstile and Cloudflare Analytics are the only third parties.
8. **`public/.assetsignore`** excludes `_worker.js` from static assets (otherwise server code would be public).
9. **Astro sessions disabled** (`session.driver: 'null'`): V1 has no sessions, and the adapter would otherwise
   require a KV binding.

## Content & UX

10. **Home "Our courses" shows all 14 course cards** (SPEC lists them), as a horizontal scroll-snap row on
    phones and a grid from tablet up, plus level and category chips that open the catalog pre-filtered.
11. **Courses can have several levels and categories**; the first category is the "primary" one shown on
    the card. Levels display as a range in curriculum order ("N5 – N1"). Beginner Japanese is
    categorized Conversation/Grammar/Vocabulary; Travel is Travel + Conversation.
12. **Conversation course is only in Premium/Private** (it relies on conversation practice, a Premium
    feature). All other courses are in all plans. Confirm with the business.
13. **"Start Learning" goes to Pricing** (step 1 of the SPEC's "How it works" is "Choose your plan"),
    "View Plans" scrolls to the home pricing section, and "Subscribe" opens Checkout with the plan.
14. **Price placeholder** is `$XX` (EN) / `XX$` (AR), driven by `price: null` in `plans.json`. No currency
    symbol or number is ever invented.
15. **Arabic numerals:** Western digits (0-9) are used in Arabic text (common in Morocco; the JLPT levels
    are written N5–N1 anyway). Arabic plurals use `Intl.PluralRules` (zero/one/two/few/many/other).
16. **Testimonials:** three placeholder cards from a data file; no names or quotes are invented.
17. **FAQ:** one data file serves the FAQ page (4 categories) and the home preview (the 9 SPEC questions,
    some with slightly different wording via `homeQuestion`). Answers avoid unconfirmed facts (class length,
    payment methods) and the uncertain ones are flagged as placeholders.
18. **"Go to My Courses"** on the success page links to the course catalog until the V2 dashboard exists.
19. **No cookie banner:** the site sets no non-essential cookies; Cloudflare Web Analytics (if enabled) is
    cookieless. Consistent with the Cookie Policy draft.
20. **The styleguide** is generated only in dev (`getStaticPaths` returns `[]` in production), at
    `/en/_styleguide` and `/ar/_styleguide`, and is noindex. Its section labels are developer-facing and in English.

## Design

21. **Palette and tokens as specified**, exposed both as raw colours (`bg-washi`, `text-vermilion`) and
    semantic tokens (`--surface`, `--text`, `--primary`…) so a dark theme only needs new token values.
22. **Japanese motifs used sparingly:** seigaiha and asanoha patterns at 4–7% opacity, sakura petals, the
    torii-inspired shape exactly twice (hero illustration and final CTA; also the OG image), and decorative
    Japanese words (日本語, 学ぶ, 講座, 料金…), all `aria-hidden`, with `lang="ja"`.
23. **Reveal animations use CSS scroll-driven animations** (no JavaScript). Browsers without support just
    show content; everything is disabled under `prefers-reduced-motion`.
24. **Decorative glyphs are rendered via `::before { content: attr(data-glyph) }`** so they aren't exposed as
    low-contrast text to assistive tech or contrast checkers.

## Performance

25. **Japanese font subsetting at build time** (`scripts/subset-jp-font.mjs`): the full Noto Serif JP subset
    from Fontsource is a single ~1.5 MB file; the generated subset with only the characters used is ~33 KB.
    It runs before `dev` and `build`, so new Japanese text is picked up automatically.
26. **Fonts:** Inter variable (one file, all weights), IBM Plex Sans Arabic 400 + 700 (600 dropped to save
    ~46 KB; semibold resolves to bold). Preloads: Inter on English pages; Arabic 400 + 700 on Arabic pages.
27. **CSS stays external** (`inlineStylesheets: 'auto'`): inlining every page's CSS was measured and didn't
    improve Lighthouse, and the external file is cached across pages.

## Testing & tooling

28. **E2E runs against the production build in `wrangler dev`** (same Workers runtime as production), so
    on-demand routes, headers and the 404 are tested for real. Includes axe-core WCAG checks.
29. **Screenshots are not committed** (~40 MB); regenerate with `pnpm screenshots`. The suite also fails on
    any horizontal overflow at 360–1536 px in both languages.
30. **Rate limiting is in-memory per isolate** (best effort). A Cloudflare WAF rate-limiting rule is
    recommended in DEPLOY.md for real protection.

## Accounts (added after V1)

31. **Hand-rolled sessions on D1 instead of Better Auth.** The needs are small (email + password,
    verification, reset, roles), and doing it with Web Crypto keeps zero runtime dependencies, full control
    over the Workers runtime constraints (PBKDF2 is capped at 100,000 iterations there) and an API that the
    existing `AuthService` client already matched. Better Auth remains a drop-in option (AUTH_PLAN.md).
32. **Unverified users can sign in.** Verification is recorded and reminded on the account page; gate
    course access on it once the learning space exists, rather than blocking the first visit.
33. **"My account" page, not a dashboard.** A small on-demand page (profile, roles, subscription status,
    logout) gives signed-in users a place to land without building the V2 LMS.
34. **`na_auth` hint cookie.** Static pages are prerendered, so a non-secret, script-readable `1` flag lets
    the header show "My account" without a request on every page. The real session cookie stays HttpOnly.
35. **Local test admin via `pnpm db:seed:local`.** The script only targets the local database, and stores
    generated credentials in the git-ignored `.dev.vars` instead of the repository.

## Student space (added after V1)

36. **Courses and lessons stay in content files; progress lives in D1.** Lessons are editorial content
    (versioned, reviewed, bilingual) while enrollments, progress, subscriptions and live classes are user
    data. Migration 0002 recreates `enrollments` without a foreign key to the unused `courses` table.
37. **Manual plan activation until payments exist.** Admins activate a plan for N months (`provider =
'manual'`); the same `subscriptions` table will be fed by payment webhooks later, so access rules
    don't change.
38. **Access rules are pure functions** (`src/lib/learning/access.ts`, unit-tested): a course is open when
    the active plan is in the course's `plans`; live classes require Premium or above.
39. **Forms post to `/api/learning/*` and `/api/admin/*`** and redirect back, so the student space works
    without JavaScript (only time-zone formatting and the admin date conversion use small scripts).
40. **Only two courses have lessons** (Hiragana & Katakana, Beginner Japanese), with short, verified
    outlines and vocabulary. Full lesson content (videos, PDFs, exercises) must come from the teacher.
41. **E2E tests use their own local database** (`.wrangler/e2e-state`) and a throwaway admin, so they never
    pollute `pnpm dev` data.
