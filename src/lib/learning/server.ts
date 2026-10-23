/**
 * D1 queries for the student space (Worker only).
 * Tables: subscriptions, enrollments, lesson_progress, live_sessions (db/migrations/).
 * Administration queries live in src/lib/admin/server.ts.
 */
import { isPlanId, type PlanId } from '@/lib/domain/types';

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------- subscriptions */

export interface ActiveSubscription {
  id: string;
  plan: PlanId;
  status: 'active' | 'trialing';
  provider: string;
  currentPeriodEnd: string | null;
}

/** The user's current subscription, if active and not past its period end. */
export const getActiveSubscription = async (
  db: D1Database,
  userId: string,
): Promise<ActiveSubscription | null> => {
  const row = await db
    .prepare(
      `SELECT id, plan_id, status, provider, current_period_end FROM subscriptions
       WHERE user_id = ?1 AND status IN ('active', 'trialing')
         AND (current_period_end IS NULL OR current_period_end > ?2)
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(userId, nowIso())
    .first<{
      id: string;
      plan_id: string;
      status: 'active' | 'trialing';
      provider: string;
      current_period_end: string | null;
    }>();
  if (!row || !isPlanId(row.plan_id)) return null;
  return {
    id: row.id,
    plan: row.plan_id,
    status: row.status,
    provider: row.provider,
    currentPeriodEnd: row.current_period_end,
  };
};

/* --------------------------------------------------------- enrollments/progress */

export interface Enrollment {
  courseId: string;
  enrolledAt: string;
  lastLessonId: string | null;
  lastActivityAt: string;
}

export const getEnrollments = async (db: D1Database, userId: string): Promise<Enrollment[]> => {
  const { results } = await db
    .prepare(
      `SELECT course_id, enrolled_at, last_lesson_id, last_activity_at FROM enrollments
       WHERE user_id = ?1 ORDER BY last_activity_at DESC`,
    )
    .bind(userId)
    .all<{
      course_id: string;
      enrolled_at: string;
      last_lesson_id: string | null;
      last_activity_at: string;
    }>();
  return results.map((r) => ({
    courseId: r.course_id,
    enrolledAt: r.enrolled_at,
    lastLessonId: r.last_lesson_id,
    lastActivityAt: r.last_activity_at,
  }));
};

export const enroll = async (db: D1Database, userId: string, courseId: string) => {
  await db
    .prepare('INSERT OR IGNORE INTO enrollments (user_id, course_id) VALUES (?1, ?2)')
    .bind(userId, courseId)
    .run();
};

/** Record that the student opened a lesson (enrolls them if needed). */
export const touchLesson = async (db: D1Database, userId: string, courseId: string, lessonId: string) => {
  await db
    .prepare(
      `INSERT INTO enrollments (user_id, course_id, last_lesson_id, last_activity_at) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT(user_id, course_id) DO UPDATE SET last_lesson_id = excluded.last_lesson_id,
         last_activity_at = excluded.last_activity_at`,
    )
    .bind(userId, courseId, lessonId, nowIso())
    .run();
};

/** Completed lesson ids, optionally for one course. */
export const getCompletedLessons = async (
  db: D1Database,
  userId: string,
  courseId?: string,
): Promise<Set<string>> => {
  const stmt = courseId
    ? db
        .prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ?1 AND course_id = ?2')
        .bind(userId, courseId)
    : db.prepare('SELECT lesson_id FROM lesson_progress WHERE user_id = ?1').bind(userId);
  const { results } = await stmt.all<{ lesson_id: string }>();
  return new Set(results.map((r) => r.lesson_id));
};

export const setLessonCompleted = async (
  db: D1Database,
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean,
) => {
  await (
    completed
      ? db
          .prepare(
            'INSERT OR IGNORE INTO lesson_progress (user_id, course_id, lesson_id) VALUES (?1, ?2, ?3)',
          )
          .bind(userId, courseId, lessonId)
      : db.prepare('DELETE FROM lesson_progress WHERE user_id = ?1 AND lesson_id = ?2').bind(userId, lessonId)
  ).run();
};

/* ----------------------------------------------------------------- live classes */

export interface LiveSession {
  id: string;
  courseId: string | null;
  title: { en: string; ar: string };
  startsAt: string;
  durationMin: number;
  meetingUrl: string | null;
  minPlan: 'premium' | 'private';
}

interface LiveRow {
  id: string;
  course_id: string | null;
  title_en: string;
  title_ar: string;
  starts_at: string;
  duration_min: number;
  meeting_url: string | null;
  min_plan: 'premium' | 'private';
}

const toLive = (r: LiveRow): LiveSession => ({
  id: r.id,
  courseId: r.course_id,
  title: { en: r.title_en, ar: r.title_ar },
  startsAt: r.starts_at,
  durationMin: r.duration_min,
  meetingUrl: r.meeting_url,
  minPlan: r.min_plan,
});

/** Sessions that have not ended yet, soonest first. */
export const getUpcomingLiveSessions = async (db: D1Database, limit = 50): Promise<LiveSession[]> => {
  // A session stays listed until it ends (start + duration).
  const { results } = await db
    .prepare(
      `SELECT * FROM live_sessions
       WHERE datetime(starts_at, '+' || duration_min || ' minutes') > datetime(?1)
       ORDER BY starts_at ASC LIMIT ?2`,
    )
    .bind(nowIso(), limit)
    .all<LiveRow>();
  return results.map(toLive);
};
