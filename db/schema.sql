-- =============================================================================
-- Cloudflare D1 (SQLite) schema — PREPARED FOR V2, NOT USED BY V1.
-- Apply with:  wrangler d1 execute nihongo-academy --file=db/schema.sql [--remote]
-- See AUTH_PLAN.md and PAYMENTS_PLAN.md. All timestamps are ISO-8601 UTC text.
-- If you adopt Better Auth, generate its tables with its CLI and keep the
-- domain tables below (plans, courses, subscriptions, enrollments) alongside.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- users & roles
CREATE TABLE IF NOT EXISTS users (
  id                 TEXT PRIMARY KEY,                 -- UUID / nanoid
  email              TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email_verified_at  TEXT,
  password_hash      TEXT,                             -- NULL for social-only accounts
  full_name          TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('ar', 'en')),
  japanese_level     TEXT NOT NULL DEFAULT 'unknown'
                     CHECK (japanese_level IN ('beginner', 'n5', 'n4', 'n3', 'n2', 'n1', 'unknown')),
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at         TEXT
);

-- Role "enum": student | teacher | admin (mirrors ROLES in src/lib/auth/types.ts).
CREATE TABLE IF NOT EXISTS roles (
  id   TEXT PRIMARY KEY CHECK (id IN ('student', 'teacher', 'admin')),
  name TEXT NOT NULL
);
INSERT OR IGNORE INTO roles (id, name) VALUES ('student', 'Student'), ('teacher', 'Teacher'), ('admin', 'Admin');

CREATE TABLE IF NOT EXISTS user_roles (
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role_id    TEXT NOT NULL REFERENCES roles (id),
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, role_id)
);

-- Public teacher profile (multi-teacher ready; the brand never depends on one teacher).
CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id      TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  bio_en       TEXT,
  bio_ar       TEXT,
  photo_url    TEXT,
  is_public    INTEGER NOT NULL DEFAULT 0 CHECK (is_public IN (0, 1))
);

-- ---------------------------------------------------------------- sessions & tokens
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,                         -- store a SHA-256 of the cookie token
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ip_address TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id         TEXT PRIMARY KEY,                         -- SHA-256 of the emailed token
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL CHECK (purpose IN ('email_verification', 'password_reset')),
  expires_at TEXT NOT NULL,
  used_at    TEXT
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON verification_tokens (user_id, purpose);

-- ---------------------------------------------------------------- catalog
CREATE TABLE IF NOT EXISTS plans (
  id                 TEXT PRIMARY KEY CHECK (id IN ('basic', 'premium', 'private')),
  sort_order         INTEGER NOT NULL,
  price_minor        INTEGER,                          -- price in minor units (cents); NULL = not set
  currency           TEXT NOT NULL DEFAULT 'USD',
  billing_interval   TEXT NOT NULL DEFAULT 'month' CHECK (billing_interval IN ('month')),
  provider_price_id  TEXT,                             -- e.g. Stripe price_… / Paddle pri_…
  is_active          INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,                        -- slug, e.g. "japanese-n5"
  sort_order  INTEGER NOT NULL,
  levels      TEXT NOT NULL,                           -- JSON array of level ids
  categories  TEXT NOT NULL,                           -- JSON array of category ids
  teacher_id  TEXT REFERENCES users (id),              -- V2: multiple teachers
  title_en    TEXT NOT NULL,
  title_ar    TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  image_url   TEXT,
  is_published INTEGER NOT NULL DEFAULT 1 CHECK (is_published IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Which plans give access to which courses.
CREATE TABLE IF NOT EXISTS plan_courses (
  plan_id   TEXT NOT NULL REFERENCES plans (id),
  course_id TEXT NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, course_id)
);

-- ---------------------------------------------------------------- billing
CREATE TABLE IF NOT EXISTS subscriptions (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users (id),
  plan_id                  TEXT NOT NULL REFERENCES plans (id),
  status                   TEXT NOT NULL
                           CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  provider                 TEXT NOT NULL,              -- 'stripe' | 'paddle' | 'lemonsqueezy' | 'paytabs' | …
  provider_customer_id     TEXT,
  provider_subscription_id TEXT UNIQUE,
  current_period_start     TEXT,
  current_period_end       TEXT,
  cancel_at_period_end     INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, status);

-- Webhook idempotency / audit log.
CREATE TABLE IF NOT EXISTS payment_events (
  id          TEXT PRIMARY KEY,                        -- provider event id
  provider    TEXT NOT NULL,
  type        TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  payload     TEXT NOT NULL                            -- raw JSON (no card data is ever received)
);

-- ---------------------------------------------------------------- learning (V2)
CREATE TABLE IF NOT EXISTS enrollments (
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id   TEXT NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  enrolled_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  PRIMARY KEY (user_id, course_id)
);
