-- Student space: subscriptions activated manually (until a payment provider is connected),
-- course enrollments, lesson progress and the live-class schedule.
-- Courses and lessons themselves live in src/content/*.json, so their ids are plain text here.

PRAGMA foreign_keys = ON;

-- Plans referenced by subscriptions.plan_id (prices stay in src/content/plans.json for now).
INSERT OR IGNORE INTO plans (id, sort_order, price_minor, currency, billing_interval)
VALUES ('basic', 1, NULL, 'USD', 'month'), ('premium', 2, NULL, 'USD', 'month'), ('private', 3, NULL, 'USD', 'month');

-- Recreate enrollments without the foreign key to the (unused) courses table.
DROP TABLE IF EXISTS enrollments;
CREATE TABLE enrollments (
  user_id        TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id      TEXT NOT NULL,                        -- slug from src/content/courses.json
  enrolled_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_lesson_id TEXT,
  last_activity_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL,
  lesson_id    TEXT NOT NULL,                          -- id from src/content/lessons.json
  completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user_course ON lesson_progress (user_id, course_id);

CREATE TABLE IF NOT EXISTS live_sessions (
  id           TEXT PRIMARY KEY,
  course_id    TEXT,                                   -- optional course slug
  title_en     TEXT NOT NULL,
  title_ar     TEXT NOT NULL,
  starts_at    TEXT NOT NULL,                          -- ISO-8601 UTC
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 10 AND 300),
  meeting_url  TEXT,                                   -- https link (Zoom, Google Meet, ...)
  min_plan     TEXT NOT NULL DEFAULT 'premium' CHECK (min_plan IN ('premium', 'private')),
  created_by   TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_start ON live_sessions (starts_at);
