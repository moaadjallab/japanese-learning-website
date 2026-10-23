# Student dashboard (V2 — not built in V1)

Planned route: `/[lang]/dashboard/` (on-demand, `prerender = false`).

- Guard with `guardRoute(session, AREA_ROLES.student, lang)` from `src/lib/auth/guard.ts`.
- Planned features: my courses, video lessons, exercises, quizzes, progress tracking, certificates, live-class schedule.
- Data: D1 tables `enrollments`, `subscriptions`, `courses` (see `db/migrations/0001_initial_schema.sql`).
- The "Go to My Courses" button on the payment success page will link here (`routes.dashboard`).
