# Admin area

Guarded by `AREA_ROLES.admin`; forms post to `src/pages/api/admin/[action].ts`.

- `src/pages/[lang]/admin.astro` — overview counts (accounts, new this week, active plans per plan,
  upcoming classes, lessons completed, suspended), account list with filters and search, CSV export
  (`GET /api/admin/export`), manual plan activation, live-class scheduling.
- `src/pages/[lang]/admin/users/[id].astro` — one account: profile, roles (teacher/admin), plan and
  subscription history, course progress, mark email verified, sign out of all devices, suspend/restore.
- Queries: `src/lib/admin/server.ts`; pure rules (role normalisation, no self-demotion/suspension,
  CSV escaping): `src/lib/admin/helpers.ts`.

Next: edit course/lesson content, teacher-facing pages, payments overview once a provider is connected.
