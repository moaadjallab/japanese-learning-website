# Teacher area (V2 — not built in V1)

Planned route: `/[lang]/teacher/` (on-demand).

- Guard with `guardRoute(session, AREA_ROLES.teacher, lang)`.
- Planned features: manage own courses and lessons, live-class schedule, student questions.
- Multi-teacher ready: courses get a `teacher_id` (see `db/migrations/0001_initial_schema.sql`); the brand never depends on one teacher.
