-- Course editor (admin): changes made from /admin/courses/ on top of src/content/courses.json.
--
-- One row per course the administrator has touched:
--   * a course from courses.json with `data` set      → edited (the JSON replaces the file's content)
--   * a course from courses.json with `data` NULL     → only its visibility flags changed
--   * an id that is not in courses.json               → a course created from the admin
--   * hidden = 1                                       → not shown to visitors or students
--   * deleted = 1 (built-in courses only)             → removed; can be restored from the admin
-- Created courses are deleted for real (row removed).

CREATE TABLE IF NOT EXISTS course_overrides (
  id         TEXT PRIMARY KEY,                           -- course slug
  data       TEXT,                                       -- JSON course content, NULL = keep courses.json
  hidden     INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  deleted    INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
