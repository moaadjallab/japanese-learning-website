/**
 * D1 queries for the administration area (Worker only, admin role enforced by the callers:
 * src/pages/[lang]/admin.astro and src/pages/api/admin/[action].ts).
 * Student-facing queries live in src/lib/learning/server.ts.
 */
import { isPlanId, type PlanId } from '@/lib/domain/types';
import type { Role } from '@/lib/auth/types';

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

/* ------------------------------------------------------------------- students */

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  createdAt: string;
  plan: PlanId | null;
  periodEnd: string | null;
}

export const listUsersForAdmin = async (
  db: D1Database,
  search = '',
  limit = 100,
): Promise<AdminUserRow[]> => {
  const like = `%${search.trim().toLowerCase()}%`;
  const { results } = await db
    .prepare(
      `SELECT u.id, u.email, u.full_name, u.created_at,
         (SELECT group_concat(role_id) FROM user_roles ur WHERE ur.user_id = u.id) AS roles,
         s.plan_id, s.current_period_end
       FROM users u
       LEFT JOIN subscriptions s ON s.id = (
         SELECT id FROM subscriptions WHERE user_id = u.id AND status IN ('active', 'trialing')
           AND (current_period_end IS NULL OR current_period_end > ?1)
         ORDER BY created_at DESC LIMIT 1)
       WHERE u.deleted_at IS NULL AND (lower(u.email) LIKE ?2 OR lower(u.full_name) LIKE ?2)
       ORDER BY u.created_at DESC LIMIT ?3`,
    )
    .bind(nowIso(), like, limit)
    .all<{
      id: string;
      email: string;
      full_name: string;
      created_at: string;
      roles: string | null;
      plan_id: string | null;
      current_period_end: string | null;
    }>();
  return results.map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    createdAt: r.created_at,
    roles: (r.roles ?? '').split(',').filter(Boolean) as Role[],
    plan: isPlanId(r.plan_id) ? r.plan_id : null,
    periodEnd: r.current_period_end,
  }));
};
