# Authentication

Email + password accounts are **implemented** on Cloudflare D1 with hand-rolled, dependency-free
sessions (the pattern popularized by Lucia). No third-party auth service, nothing faked.

## What exists

| Piece                                                                                                     | Location                                                              |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Types: `Role = 'student' \| 'teacher' \| 'admin'`, `User`, `Session`                                      | `src/lib/auth/types.ts`                                               |
| Password hashing (PBKDF2-SHA256, 100k iterations, random salt), tokens, constant-time compare             | `src/lib/auth/server/crypto.ts`                                       |
| D1 queries: users, roles, sessions, one-time tokens                                                       | `src/lib/auth/server/repository.ts`                                   |
| Cookies (`na_session` HttpOnly + `na_auth` UI hint)                                                       | `src/lib/auth/server/cookies.ts`                                      |
| Session loading, localized auth emails                                                                    | `src/lib/auth/server/index.ts`                                        |
| API: `register`, `login`, `logout`, `session`, `forgot-password`, `reset-password`, `resend-verification` | `src/pages/api/auth/[action].ts`                                      |
| Middleware → `Astro.locals.session` on on-demand pages                                                    | `src/middleware.ts`                                                   |
| Route guard `guardRoute(session, AREA_ROLES.x, lang)`                                                     | `src/lib/auth/guard.ts`                                               |
| Pages: login, register, forgot-password, reset-password, verify-email, **account**                        | `src/pages/[lang]/…`                                                  |
| Browser client `authService` + form islands                                                               | `src/lib/auth/AuthService.ts`, `src/components/islands/AuthForms.tsx` |
| Schema / migrations                                                                                       | `db/migrations/0001_initial_schema.sql`                               |
| Local admin test account                                                                                  | `scripts/seed-admin.mjs` (`pnpm db:seed:local`)                       |

## Flows

- **Register** → user created with role `student` → signed in → redirected to `/[lang]/account/` →
  verification email sent (link valid 48 h). Unverified users can still sign in; gate course access on
  `emailVerified` once courses are online.
- **Login** → generic error for a wrong email _or_ password; a dummy hash is checked when the email does
  not exist so timing does not reveal accounts. `?next=` (same-locale paths only) is honored.
- **Forgot password** → always the same answer; if the account exists, a reset link (valid 1 h, single use)
  is emailed. **Reset** sets the new password and signs out every device.
- **Logout** → deletes the session row and both cookies; works as a plain form post (no JavaScript needed).
- **Header**: static pages read the non-secret `na_auth=1` cookie to show "My account" instead of "Login".

## Security notes

- Session tokens are 256-bit random values; only their SHA-256 is stored. Same for email tokens.
- Cookie: `HttpOnly; SameSite=Lax; Path=/; Secure` on https; 30-day sliding expiry (renewed when < 15 days remain).
- CSRF: Astro's built-in origin check on non-GET requests + SameSite cookies.
- Rate limiting: login (10/15 min per IP+email), register (5/h per IP), email sends (5/h). In-memory per
  Worker isolate, so **also add a Cloudflare WAF rate-limiting rule on `/api/auth/*`** (see DEPLOY.md).
- Passwords: at least 8 characters with a letter and a digit (shared Zod schema, client + server).
- Responses for signed-in users are `Cache-Control: private, no-store`.
- No roles can be self-assigned: `teacher`/`admin` are granted directly in D1 (or by a future admin UI).

## Local development

```bash
pnpm db:migrate:local    # create the tables in the local D1 (.wrangler/state)
pnpm db:seed:local       # admin test account; credentials saved in .dev.vars (SEED_ADMIN_*)
pnpm dev
```

Without `RESEND_API_KEY`, emails are printed in the dev-server terminal (with the verification/reset links).

## Next steps

- Student learning space (V2 LMS) behind `guardRoute(session, AREA_ROLES.student, lang)`.
- Teacher and admin areas (`src/features/teacher`, `src/features/admin`).
- Optional: Turnstile on register/forgot-password, 2FA for teachers/admins, social sign-in.
- If you prefer a library later, Better Auth can replace `src/lib/auth/server/` behind the same API.
