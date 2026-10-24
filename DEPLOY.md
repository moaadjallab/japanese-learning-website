# Deploying to Cloudflare

The site deploys as a **Cloudflare Worker with static assets** (`@astrojs/cloudflare` adapter):

- Prerendered pages, images, fonts and JS are served directly from Cloudflare's edge (`dist/`).
- A small Worker (`dist/_worker.js`) handles the on-demand routes only: `/` (language redirect),
  `/[lang]/checkout/`, `/[lang]/checkout/success/`, the localized 404 and `/api/*`.
- `dist/_headers` (generated at build) adds security headers and a strict CSP to static responses;
  `src/middleware.ts` adds the same headers to Worker responses.
- `public/.assetsignore` keeps `_worker.js` from being published as a static file. Do not remove it.

Configuration lives in [`wrangler.jsonc`](wrangler.jsonc).

---

## 1. One-time setup

1. Create a free Cloudflare account and add your domain (Cloudflare becomes your DNS provider:
   change the nameservers at your registrar to the two shown by Cloudflare).
2. Push this repository to GitHub or GitLab.

## 2. Connect the repository (Workers Builds, recommended)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → select the repo.
2. Settings:
   - **Project name:** `japanese-learning-website` (must match `name` in `wrangler.jsonc`)
   - **Build command:** `pnpm build`
   - **Deploy command:** `npx wrangler deploy`
   - **Root directory:** `/`
   - **Node version:** set the build variable `NODE_VERSION=22` (pnpm is detected from `packageManager`).
3. **Build variables** (Settings → Build → Variables), needed at _build_ time:

   | Name                        | Example                      | Notes                                    |
   | --------------------------- | ---------------------------- | ---------------------------------------- |
   | `SITE_URL`                  | `https://www.yourdomain.com` | Canonical URLs, sitemap, hreflang, OG.   |
   | `PUBLIC_TURNSTILE_SITE_KEY` | `0x4AAAA…`                   | Turnstile _site_ key (public).           |
   | `PUBLIC_CF_ANALYTICS_TOKEN` | _(empty)_                    | Optional Cloudflare Web Analytics token. |

4. **Runtime variables & secrets** (Worker → Settings → Variables and Secrets → _Secret_):

   | Name                                           | Required | Notes                                                                                |
   | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
   | `TURNSTILE_SECRET_KEY`                         | **yes**  | Without it `/api/contact` answers 503 in production.                                 |
   | `RESEND_API_KEY`                               | **yes**  | Resend API key (contact form email).                                                 |
   | `CONTACT_TO_EMAIL`                             | **yes**  | Inbox that receives contact messages.                                                |
   | `CONTACT_FROM_EMAIL`                           | **yes**  | Verified sender, e.g. `Nihongo Academy <no-reply@yourdomain.com>`.                   |
   | `CHECKOUT_URL_BASIC` / `_PREMIUM` / `_PRIVATE` | no       | Provider-hosted checkout links (https only). Empty → "payments are being activated". |

   CLI alternative: `npx wrangler secret put RESEND_API_KEY` (repeat for each secret).

5. Deploy. Every push to the production branch redeploys; other branches get preview URLs.

### Alternative: deploy from your machine

```bash
npx wrangler login
SITE_URL=https://www.yourdomain.com pnpm deploy
```

## 2b. D1 database (accounts) — required before the first deploy

1. `npx wrangler d1 create nihongo-academy`
2. Copy the printed `database_id` into `wrangler.jsonc` (replace `00000000-0000-0000-0000-000000000000`)
   and commit. Deploys fail until this is done.
3. Create the tables: `pnpm db:migrate:remote` (run it again whenever a new file appears in `db/migrations/`).
4. Create the first admin: register normally on the live site, then grant the role:

   ```bash
   npx wrangler d1 execute DB --remote --command "INSERT INTO user_roles (user_id, role_id) SELECT id, 'admin' FROM users WHERE email = 'you@yourdomain.com'"
   ```

Auth emails (verification, password reset) use the same `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` as the
contact form. Add a WAF rate-limiting rule on `/api/auth/*` as well (e.g. 20 requests / 10 minutes per IP).

## 3. Custom domain & DNS

1. Worker → **Settings → Domains & Routes → Add → Custom domain** → `www.yourdomain.com`
   (Cloudflare creates the DNS record and TLS certificate automatically).
2. Add the apex too (`yourdomain.com`), or redirect apex → www with a **Redirect Rule**
   (Rules → Redirect Rules → "Redirect from root to WWW").
3. SSL/TLS → set encryption mode **Full (strict)**; enable **Always Use HTTPS**.
4. Update `SITE_URL` to the final domain and redeploy.

## 4. Contact form services

**Cloudflare Turnstile** (anti-spam): dashboard → Turnstile → Add widget → add your domain(s) and
`localhost` for testing → copy the _site key_ (`PUBLIC_TURNSTILE_SITE_KEY`) and _secret key_ (`TURNSTILE_SECRET_KEY`).

**Resend** (email): create an account → Domains → add `yourdomain.com` → add the SPF/DKIM DNS records it
shows (in Cloudflare DNS) → wait for "Verified" → create an API key with _sending_ access.
Prefer another provider? Implement `EmailProvider` in `src/lib/email/` (see `resend.ts`).

**Rate limiting:** the API has a basic in-memory limiter. For stronger protection add a WAF rule:
Security → WAF → Rate limiting rules → `URI Path equals /api/contact`, e.g. 5 requests / 10 minutes per IP → Block.

## 5. Optional

- **Web Analytics:** Analytics & Logs → Web Analytics → add site → copy token into
  `PUBLIC_CF_ANALYTICS_TOKEN` (build variable) → redeploy. It is cookieless (no consent banner needed).

## 6. After deploying, check

- `https://www.yourdomain.com/` redirects to `/ar/` or `/en/` depending on the browser language.
- `/robots.txt` and `/sitemap-index.xml` use your real domain.
- Response headers include `Content-Security-Policy` (e.g. `curl -I https://www.yourdomain.com/en/`).
- Send a test message from `/en/contact/` and confirm it arrives.
- Submit the sitemap in Google Search Console (and Bing Webmaster Tools).
- Legal pages stay `noindex` until they are reviewed. Remove `noindex` in
  `src/pages/[lang]/legal/[doc].astro` and the `/legal/` entry in `astro.config.mjs` (sitemap filter) once final.
