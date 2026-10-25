-- Lesson editor (admin): changes made from /admin/courses/<course>/ on top of src/content/lessons.json.
-- Same rules as course_overrides (0003):
--   * a lesson from lessons.json with `data` set   → edited (the JSON replaces the file's content)
--   * a lesson from lessons.json with `data` NULL  → only its visibility flags changed
--   * an id that is not in lessons.json            → a lesson created from the admin
--   * hidden = 1 → not shown to students; deleted = 1 (built-in lessons only) → removed, restorable
-- Created lessons are deleted for real (row removed). Students' progress (lesson_progress) is kept.

CREATE TABLE IF NOT EXISTS lesson_overrides (
  id         TEXT PRIMARY KEY,                           -- "<course-slug>/<lesson-slug>"
  course_id  TEXT NOT NULL,                              -- course slug (built-in or created)
  data       TEXT,                                       -- JSON lesson content, NULL = keep lessons.json
  hidden     INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
  deleted    INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_overrides_course ON lesson_overrides (course_id);
