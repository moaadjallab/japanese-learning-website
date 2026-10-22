# Authentication plan (V2)

V1 ships the **UI and the architecture only**. There are no real accounts and no fake sessions:
`/api/auth/*` answers `501 not_implemented` and the forms show "Accounts are coming soon".

## What already exists (V1)

| Piece                                                                                                     | Location                                           |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Types: `Role = 'student' \| 'teacher' \| 'admin'`, `User`, `Session`, requests                            | `src/lib/auth/types.ts`                            |
| `AuthService` interface + `HttpAuthService` client used by every form                                     | `src/lib/auth/AuthService.ts`                      |
| Login / Register / Forgot-password UI (validation, a11y, loading, password toggle)                        | `src/components/islands/AuthForms.tsx`             |
| Shared Zod schemas (client + server)                                                                      | `src/lib/validation/schemas.ts`                    |
| Route guard `guardRoute(session, AREA_ROLES.x, lang)`                                                     | `src/lib/auth/guard.ts`                            |
| API stubs (`login`, `register`, `logout`, `session`, `forgot-password`, `reset-password`, `verify-email`) | `src/pages/api/auth/[action].ts`                   |
| D1 tables: `users`, `roles`, `user_roles`, `sessions`, `verification_tokens`, `teacher_profiles`          | `db/schema.sql`                                    |
| Future areas (not built)                                                                                  | `src/features/{dashboard,teacher,admin}/README.md` |

## Recommended approach

**[Better Auth](https://www.better-auth.com/) on Cloudflare D1** (via its Kysely/Drizzle adapter).

- Framework-agnostic and works in the Workers runtime; has an Astro integration guide.
- Email + password out of the box, with **email verification** and **password reset** flows,
  session management, rate limiting, and plugins for roles/admin, 2FA and social sign-in later.
- Lucia v3 is deprecated as a library (its author now maintains it as a learning resource), so
  prefer Better Auth, or hand-roll the same pattern following the Lucia guide if you need full control.

### Implementation steps

1. **D1:** create the database and bind it as `DB` (see DEPLOY.md). Let Better Auth's CLI generate its
   tables (`user`, `session`, `account`, `verification`) and keep the domain tables from `db/schema.sql`
   (`plans`, `courses`, `subscriptions`, `enrollments`, `user_roles`). Map our extra user fields
   (`preferredLanguage`, `japaneseLevel`) as Better Auth `additionalFields`.
2. **Server:** create `src/lib/auth/server.ts` that builds the Better Auth instance per request from
   `locals.runtime.env.DB` and secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).
3. **API:** replace the stub in `src/pages/api/auth/[action].ts` with the Better Auth handler (or keep our
   action names and call its server API, so `HttpAuthService` doesn't change).
4. **Middleware:** in `src/middleware.ts`, read the session cookie and put `session` on `Astro.locals`.
   Protected pages are on-demand (`prerender = false`) and call `guardRoute()`.
5. **Emails:** send verification and reset emails through the existing `EmailProvider` (Resend),
   localized with the user's `preferredLanguage`.
6. **Roles:** every new user gets `student`. Teachers/admins are granted by an admin (never self-assigned).

### Security requirements

- Passwords hashed with a slow KDF (Better Auth uses scrypt). Never log passwords or tokens.
- Session cookie: `HttpOnly; Secure; SameSite=Lax; Path=/`; rotate on login; short absolute expiry + idle expiry.
- Store only **hashes** of session/verification/reset tokens; reset tokens expire within ~1 hour and are single-use.
- Generic error messages ("email or password is incorrect"); identical response for forgot-password whether or
  not the email exists.
- Rate-limit login, register and forgot-password (Better Auth rate limiter + Cloudflare WAF rule) and
  add Turnstile to register/forgot-password.
- Require verified email before granting course access; re-verify on email change.
- CSRF: same-origin checks (already enforced by Astro's `checkOrigin`) and SameSite cookies.
- Update the Privacy Policy and Cookie Policy (a strictly necessary session cookie) before launch.

### Then, in later versions

Student dashboard (`/[lang]/dashboard/`), teacher area, admin area, social sign-in (Google/Apple),
optional 2FA for teachers and admins.
