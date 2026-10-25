/**
 * D1 queries for the administration area (Worker only, admin role enforced by the callers:
 * src/pages/[lang]/admin*.astro and src/pages/api/admin/[action].ts).
 * Student-facing queries live in src/lib/learning/server.ts.
 */
import { isPlanId, type PlanId } from '@/lib/domain/types';
import type { JapaneseLevel, PreferredLanguage, Role } from '@/lib/auth/types';
import { normalizeRoles, type UserFilter } from './helpers';
import type { CourseData } from '@/lib/courses/editor';

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------- subscriptions */

/**
 * Manually activate a plan (payment received by bank transfer, WhatsApp, …) until a payment
 * provider is connected. Ends any current subscription first. `months` = access duration.
 */
export const activateManualSubscription = async (
  db: D1Database,
  userId: string,
  plan: PlanId,
  months: number,
) => {
  const start = new Date();
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + months);
  await db.batch([
    db
      .prepare(
        `UPDATE subscriptions SET status = 'canceled', updated_at = ?1
         WHERE user_id = ?2 AND status IN ('active', 'trialing')`,
      )
      .bind(nowIso(), userId),
    db
      .prepare(
        `INSERT INTO subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
         VALUES (?1, ?2, ?3, 'active', 'manual', ?4, ?5)`,
      )
      .bind(crypto.randomUUID(), userId, plan, start.toISOString(), end.toISOString()),
  ]);
};

export const cancelSubscriptions = async (db: D1Database, userId: string) => {
  await db
    .prepare(
      `UPDATE subscriptions SET status = 'canceled', updated_at = ?1
       WHERE user_id = ?2 AND status IN ('active', 'trialing')`,
    )
    .bind(nowIso(), userId)
    .run();
};

/* ----------------------------------------------------------------- live classes */

export interface NewLiveSession {
  courseId: string | null;
  titleEn: string;
  titleAr: string;
  startsAt: string;
  durationMin: number;
  meetingUrl: string | null;
  minPlan: 'premium' | 'private';
}

export const createLiveSession = async (db: D1Database, input: NewLiveSession, createdBy: string) => {
  await db
    .prepare(
      `INSERT INTO live_sessions (id, course_id, title_en, title_ar, starts_at, duration_min, meeting_url, min_plan, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
    .bind(
      crypto.randomUUID(),
      input.courseId,
      input.titleEn,
      input.titleAr,
      input.startsAt,
      input.durationMin,
      input.meetingUrl,
      input.minPlan,
      createdBy,
    )
    .run();
};

export const deleteLiveSession = async (db: D1Database, id: string) => {
  await db.prepare('DELETE FROM live_sessions WHERE id = ?1').bind(id).run();
};

/* ----------------------------------------------------------------- overview */

export interface AdminStats {
  students: number;
  newThisWeek: number;
  suspended: number;
  activeByPlan: Record<PlanId, number>;
  upcomingClasses: number;
  lessonsThisWeek: number;
}

type Row = Record<string, string | number | null>;

/** Real counts from D1 for the overview cards (nothing estimated). */
export const getAdminStats = async (db: D1Database): Promise<AdminStats> => {
  const now = nowIso();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const [users, plans, classes, lessons] = await db.batch<Row>([
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) AS students,
           SUM(CASE WHEN deleted_at IS NULL AND created_at >= ?1 THEN 1 ELSE 0 END) AS new_week,
           SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS suspended
         FROM users`,
      )
      .bind(weekAgo),
    db
      .prepare(
        `SELECT s.plan_id, COUNT(DISTINCT s.user_id) AS n FROM subscriptions s
         JOIN users u ON u.id = s.user_id AND u.deleted_at IS NULL
         WHERE s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > ?1)
         GROUP BY s.plan_id`,
      )
      .bind(now),
    db.prepare('SELECT COUNT(*) AS n FROM live_sessions WHERE starts_at > ?1').bind(now),
    db.prepare('SELECT COUNT(*) AS n FROM lesson_progress WHERE completed_at >= ?1').bind(weekAgo),
  ]);
  const u = users?.results[0] ?? {};
  const activeByPlan: Record<PlanId, number> = { basic: 0, premium: 0, private: 0 };
  for (const row of plans?.results ?? []) {
    if (isPlanId(row.plan_id)) activeByPlan[row.plan_id] = Number(row.n ?? 0);
  }
  return {
    students: Number(u.students ?? 0),
    newThisWeek: Number(u.new_week ?? 0),
    suspended: Number(u.suspended ?? 0),
    activeByPlan,
    upcomingClasses: Number(classes?.results[0]?.n ?? 0),
    lessonsThisWeek: Number(lessons?.results[0]?.n ?? 0),
  };
};

/* ------------------------------------------------------------------- students */

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  createdAt: string;
  plan: PlanId | null;
  periodEnd: string | null;
  suspended: boolean;
}

type UserRowDb = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  deleted_at: string | null;
  preferred_language: string;
  japanese_level: string;
  email_verified_at: string | null;
  roles: string | null;
  plan_id: string | null;
  current_period_end: string | null;
};

// ?1 = now (for the current-subscription lookup).
const USER_SELECT = `SELECT u.id, u.email, u.full_name, u.created_at, u.deleted_at,
    u.preferred_language, u.japanese_level, u.email_verified_at,
    (SELECT group_concat(role_id) FROM user_roles ur WHERE ur.user_id = u.id) AS roles,
    s.plan_id, s.current_period_end
  FROM users u
  LEFT JOIN subscriptions s ON s.id = (
    SELECT id FROM subscriptions WHERE user_id = u.id AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > ?1)
    ORDER BY created_at DESC LIMIT 1)`;

const FILTER_SQL: Record<UserFilter, string> = {
  all: 'u.deleted_at IS NULL',
  subscribed: 'u.deleted_at IS NULL AND s.plan_id IS NOT NULL',
  unsubscribed: 'u.deleted_at IS NULL AND s.plan_id IS NULL',
  staff: `u.deleted_at IS NULL AND EXISTS (
    SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role_id IN ('teacher', 'admin'))`,
  suspended: 'u.deleted_at IS NOT NULL',
};

const toAdminUserRow = (r: UserRowDb): AdminUserRow => ({
  id: r.id,
  email: r.email,
  fullName: r.full_name,
  createdAt: r.created_at,
  roles: (r.roles ?? '').split(',').filter(Boolean) as Role[],
  plan: isPlanId(r.plan_id) ? r.plan_id : null,
  periodEnd: r.current_period_end,
  suspended: Boolean(r.deleted_at),
});

export const listUsersForAdmin = async (
  db: D1Database,
  { search = '', filter = 'all', limit = 100 }: { search?: string; filter?: UserFilter; limit?: number } = {},
): Promise<AdminUserRow[]> => {
  const like = `%${search.trim().toLowerCase()}%`;
  const { results } = await db
    .prepare(
      `${USER_SELECT}
       WHERE ${FILTER_SQL[filter]} AND (lower(u.email) LIKE ?2 OR lower(u.full_name) LIKE ?2)
       ORDER BY u.created_at DESC LIMIT ?3`,
    )
    .bind(nowIso(), like, limit)
    .all<UserRowDb>();
  return results.map(toAdminUserRow);
};

export interface AdminExportRow extends AdminUserRow {
  language: string;
  level: string;
  emailVerified: boolean;
}

/** Every account (suspended included) for the CSV export. */
export const listAllUsersForExport = async (db: D1Database): Promise<AdminExportRow[]> => {
  const { results } = await db
    .prepare(`${USER_SELECT} ORDER BY u.created_at DESC LIMIT 10000`)
    .bind(nowIso())
    .all<UserRowDb>();
  return results.map((r) => ({
    ...toAdminUserRow(r),
    language: r.preferred_language,
    level: r.japanese_level,
    emailVerified: Boolean(r.email_verified_at),
  }));
};

/* ----------------------------------------------------------------- one student */

export interface AdminUserDetail extends AdminUserRow {
  preferredLanguage: PreferredLanguage;
  japaneseLevel: JapaneseLevel;
  emailVerified: boolean;
  activeSessions: number;
  subscriptions: {
    plan: PlanId | null;
    status: string;
    provider: string;
    start: string | null;
    end: string | null;
  }[];
  progress: { courseId: string; completed: number; lastActivityAt: string | null }[];
}

/** Full profile for /admin/users/[id] (suspended accounts included). */
export const getUserDetailForAdmin = async (
  db: D1Database,
  userId: string,
): Promise<AdminUserDetail | null> => {
  const now = nowIso();
  const [base, subs, progress, sessions] = await db.batch<Row>([
    db.prepare(`${USER_SELECT} WHERE u.id = ?2`).bind(now, userId),
    db
      .prepare(
        `SELECT plan_id, status, provider, current_period_start, current_period_end
         FROM subscriptions WHERE user_id = ?1 ORDER BY created_at DESC LIMIT 50`,
      )
      .bind(userId),
    db
      .prepare(
        `SELECT c.course_id,
           (SELECT COUNT(*) FROM lesson_progress p WHERE p.user_id = ?1 AND p.course_id = c.course_id) AS completed,
           (SELECT e.last_activity_at FROM enrollments e WHERE e.user_id = ?1 AND e.course_id = c.course_id) AS last_activity_at
         FROM (SELECT course_id FROM enrollments WHERE user_id = ?1
               UNION SELECT course_id FROM lesson_progress WHERE user_id = ?1) c
         ORDER BY last_activity_at DESC`,
      )
      .bind(userId),
    db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ?1 AND expires_at > ?2').bind(userId, now),
  ]);
  const row = base?.results[0] as unknown as UserRowDb | undefined;
  if (!row) return null;
  return {
    ...toAdminUserRow(row),
    preferredLanguage: row.preferred_language === 'ar' ? 'ar' : 'en',
    japaneseLevel: row.japanese_level as JapaneseLevel,
    emailVerified: Boolean(row.email_verified_at),
    activeSessions: Number(sessions?.results[0]?.n ?? 0),
    subscriptions: (subs?.results ?? []).map((s) => ({
      plan: isPlanId(s.plan_id) ? s.plan_id : null,
      status: String(s.status),
      provider: String(s.provider),
      start: (s.current_period_start as string | null) ?? null,
      end: (s.current_period_end as string | null) ?? null,
    })),
    progress: (progress?.results ?? []).map((p) => ({
      courseId: String(p.course_id),
      completed: Number(p.completed ?? 0),
      lastActivityAt: (p.last_activity_at as string | null) ?? null,
    })),
  };
};

/** Replace the user's roles (student is always kept). */
export const setUserRoles = async (db: D1Database, userId: string, roles: readonly Role[]) => {
  await db.batch([
    db.prepare('DELETE FROM user_roles WHERE user_id = ?1').bind(userId),
    ...normalizeRoles(roles).map((role) =>
      db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?1, ?2)').bind(userId, role),
    ),
  ]);
};

/**
 * Suspend (soft-delete) or restore an account. Suspended users can't sign in and every open
 * session is closed at once; their data (progress, subscriptions) is kept.
 */
export const setUserSuspended = async (db: D1Database, userId: string, suspended: boolean) => {
  const now = nowIso();
  await db.batch([
    db
      .prepare(
        suspended
          ? 'UPDATE users SET deleted_at = COALESCE(deleted_at, ?1), updated_at = ?1 WHERE id = ?2'
          : 'UPDATE users SET deleted_at = NULL, updated_at = ?1 WHERE id = ?2',
      )
      .bind(now, userId),
    ...(suspended ? [db.prepare('DELETE FROM sessions WHERE user_id = ?1').bind(userId)] : []),
  ]);
};

/* ------------------------------------------------------------------- courses */

/** Create or replace a course's content (built-in course → edited copy; new id → created course). */
export const saveCourse = async (
  db: D1Database,
  slug: string,
  data: CourseData,
  hidden: boolean,
  by: string,
) => {
  await db
    .prepare(
      `INSERT INTO course_overrides (id, data, hidden, deleted, updated_at, updated_by)
       VALUES (?1, ?2, ?3, 0, ?4, ?5)
       ON CONFLICT (id) DO UPDATE SET data = ?2, hidden = ?3, updated_at = ?4, updated_by = ?5`,
    )
    .bind(slug, JSON.stringify(data), hidden ? 1 : 0, nowIso(), by)
    .run();
};

/** Show or hide a course (keeps its content). */
export const setCourseHidden = async (db: D1Database, slug: string, hidden: boolean, by: string) => {
  await db
    .prepare(
      `INSERT INTO course_overrides (id, data, hidden, deleted, updated_at, updated_by)
       VALUES (?1, NULL, ?2, 0, ?3, ?4)
       ON CONFLICT (id) DO UPDATE SET hidden = ?2, updated_at = ?3, updated_by = ?4`,
    )
    .bind(slug, hidden ? 1 : 0, nowIso(), by)
    .run();
};

/** Built-in course: mark as deleted (restorable). Created course: remove it for good. */
export const deleteCourse = async (db: D1Database, slug: string, builtin: boolean, by: string) => {
  if (!builtin) {
    await db.prepare('DELETE FROM course_overrides WHERE id = ?1').bind(slug).run();
    return;
  }
  await db
    .prepare(
      `INSERT INTO course_overrides (id, data, hidden, deleted, updated_at, updated_by)
       VALUES (?1, NULL, 0, 1, ?2, ?3)
       ON CONFLICT (id) DO UPDATE SET deleted = 1, updated_at = ?2, updated_by = ?3`,
    )
    .bind(slug, nowIso(), by)
    .run();
};

/** Bring back a deleted built-in course (with its edits, if any). */
export const restoreCourse = async (db: D1Database, slug: string, by: string) => {
  await db
    .prepare('UPDATE course_overrides SET deleted = 0, updated_at = ?2, updated_by = ?3 WHERE id = ?1')
    .bind(slug, nowIso(), by)
    .run();
};

/** Drop the edits of a built-in course (back to courses.json), keeping its visibility. */
export const resetCourse = async (db: D1Database, slug: string, by: string) => {
  await db
    .prepare('UPDATE course_overrides SET data = NULL, updated_at = ?2, updated_by = ?3 WHERE id = ?1')
    .bind(slug, nowIso(), by)
    .run();
};

/** Students enrolled per course (for the course list). */
export const countEnrollmentsByCourse = async (db: D1Database): Promise<Record<string, number>> => {
  const { results } = await db
    .prepare('SELECT course_id, COUNT(*) AS n FROM enrollments GROUP BY course_id')
    .all<{ course_id: string; n: number }>();
  return Object.fromEntries(results.map((r) => [r.course_id, Number(r.n)]));
};
