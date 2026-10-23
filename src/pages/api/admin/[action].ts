/**
 * /api/admin/* — administrator actions (plain HTML form posts, admin role required).
 *   POST subscription   userId, plan, months   → activate a plan manually (payment received offline)
 *   POST cancel         userId                 → end the current subscription
 *   POST live-create    titleEn, titleAr, startsAt (UTC ISO), durationMin, meetingUrl?, courseId?, minPlan
 *   POST live-delete    id
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/config';
import { jsonError } from '@/lib/api/response';
import { hasAnyRole } from '@/lib/auth/guard';
import { getDb, loadSession } from '@/lib/auth/server';
import { PLAN_IDS } from '@/lib/domain/types';
import {
  activateManualSubscription,
  cancelSubscriptions,
  createLiveSession,
  deleteLiveSession,
} from '@/lib/admin/server';
import { getCourse } from '@/lib/repositories/courses';
import { routes } from '@/lib/routes';

export const prerender = false;

const id = z.string().min(1).max(100);
const schemas = {
  subscription: z.object({
    userId: id,
    plan: z.enum(PLAN_IDS),
    months: z.coerce.number().int().min(1).max(24),
  }),
  cancel: z.object({ userId: id }),
  'live-create': z.object({
    titleEn: z.string().trim().min(3).max(150),
    titleAr: z.string().trim().min(3).max(150),
    startsAt: z.string().datetime(),
    durationMin: z.coerce.number().int().min(10).max(300),
    meetingUrl: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((v) => v || null)
      .refine((v) => v === null || /^https:\/\//.test(v), 'https only'),
    courseId: z
      .string()
      .optional()
      .transform((v) => v || null),
    minPlan: z.enum(['premium', 'private']),
  }),
  'live-delete': z.object({ id }),
} as const;

export const POST: APIRoute = async (ctx) => {
  const db = getDb(ctx.locals);
  if (!db) return jsonError(501, 'not_implemented', 'Database not configured.');
  const langParam = ctx.url.searchParams.get('lang');
  const lang: Locale = isLocale(langParam) ? langParam : 'en';
  const back = (status: string) => ctx.redirect(`${routes.admin(lang)}?done=${status}`, 303);

  const session = await loadSession(ctx);
  if (!hasAnyRole(session, ['admin'])) return jsonError(403, 'forbidden', 'Administrators only.');

  const action = ctx.params.action as keyof typeof schemas;
  const schema = schemas[action];
  if (!schema) return jsonError(404, 'bad_request', 'Unknown action.');
  const parsed = schema.safeParse(Object.fromEntries(await ctx.request.formData()));
  if (!parsed.success) return back('invalid');

  switch (action) {
    case 'subscription': {
      const data = parsed.data as z.infer<(typeof schemas)['subscription']>;
      await activateManualSubscription(db, data.userId, data.plan, data.months);
      return back('subscription');
    }
    case 'cancel': {
      await cancelSubscriptions(db, (parsed.data as z.infer<(typeof schemas)['cancel']>).userId);
      return back('cancel');
    }
    case 'live-create': {
      const data = parsed.data as z.infer<(typeof schemas)['live-create']>;
      if (data.courseId && !(await getCourse(data.courseId))) return back('invalid');
      await createLiveSession(db, data, session!.userId);
      return back('live-create');
    }
    case 'live-delete': {
      await deleteLiveSession(db, (parsed.data as z.infer<(typeof schemas)['live-delete']>).id);
      return back('live-delete');
    }
  }
};
