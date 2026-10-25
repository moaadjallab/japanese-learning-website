/**
 * /api/admin/* — administrator actions (plain HTML form posts, admin role required).
 *   POST subscription   userId, plan, months   → activate a plan manually (payment received offline)
 *   POST cancel         userId                 → end the current subscription
 *   POST roles          userId, roles[]        → replace roles (student always kept)
 *   POST suspend        userId                 → block sign-in and close every session (data kept)
 *   POST restore        userId                 → lift a suspension
 *   POST verify-email   userId                 → mark the email address as verified
 *   POST signout        userId                 → close every session of that user
 *   POST live-create    titleEn, titleAr, startsAt (UTC ISO), durationMin, meetingUrl?, courseId?, minPlan
 *   POST live-delete    id
 *   GET  export                                → users.csv
 *   POST course-save    mode (create|update), slug, course fields (see parseCourseForm), hidden?
 *   POST course-hide | course-show | course-delete | course-restore | course-reset    slug
 *   POST lesson-save    mode (create|update), course, slug, lesson fields (see parseLessonForm), hidden?
 *   POST lesson-hide | lesson-show | lesson-delete | lesson-restore | lesson-reset    course, slug
 * User actions accept `from=user` to return to that user's admin page instead of the list;
 * course and lesson actions accept `from=editor` to return to their editor.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/config';
import { jsonError } from '@/lib/api/response';
import { hasAnyRole } from '@/lib/auth/guard';
import { deleteUserSessions, getDb, loadSession, markEmailVerified } from '@/lib/auth/server';
import { ROLES } from '@/lib/auth/types';
import { PLAN_IDS } from '@/lib/domain/types';
import { checkSelfAction, toCsv } from '@/lib/admin/helpers';
import {
  activateManualSubscription,
  cancelSubscriptions,
  createLiveSession,
  deleteLiveSession,
  listAllUsersForExport,
  setUserRoles,
  setUserSuspended,
  saveCourse,
  setCourseHidden,
  deleteCourse,
  restoreCourse,
  resetCourse,
  saveLesson,
  setLessonHidden,
  deleteLesson,
  restoreLesson,
  resetLesson,
} from '@/lib/admin/server';
import { getAdminCourses, getCourse } from '@/lib/repositories/courses';
import { parseCourseForm, slugSchema } from '@/lib/courses/editor';
import { lessonId, parseLessonForm } from '@/lib/courses/lessons';
import { getAdminLessons } from '@/lib/repositories/lessons';
import { routes } from '@/lib/routes';

export const prerender = false;

const id = z.string().min(1).max(100);
const user = z.object({ userId: id, from: z.enum(['user', 'list']).optional() });
const schemas = {
  subscription: user.extend({
    plan: z.enum(PLAN_IDS),
    months: z.coerce.number().int().min(1).max(24),
  }),
  cancel: user,
  roles: user.extend({ roles: z.array(z.enum(ROLES)).max(ROLES.length) }),
  suspend: user,
  restore: user,
  'verify-email': user,
  signout: user,
  'live-create': z
    .object({
      titleEn: z.string().trim().min(3).max(150),
      titleAr: z.string().trim().min(3).max(150),
      startsAt: z.string().datetime(),
      durationMin: z.coerce.number().int().min(10).max(300),
      meetingUrl: z
        .string()
        .trim()
        .max(500)
        .optional()
        .transform((v) => v || null),
      courseId: z
        .string()
        .optional()
        .transform((v) => v || null),
      minPlan: z.enum(['premium', 'private']),
    })
    .refine((v) => v.meetingUrl === null || /^https:\/\//.test(v.meetingUrl), 'https only'),
  'live-delete': z.object({ id }),
} as const;

type Action = keyof typeof schemas;
type Data<A extends Action> = z.infer<(typeof schemas)[A]>;

const langOf = (url: URL): Locale => {
  const lang = url.searchParams.get('lang');
  return isLocale(lang) ? lang : 'en';
};

export const GET: APIRoute = async (ctx) => {
  if (ctx.params.action !== 'export') return jsonError(404, 'bad_request', 'Unknown action.');
  const db = getDb(ctx.locals);
  if (!db) return jsonError(501, 'not_implemented', 'Database not configured.');
  if (!hasAnyRole(await loadSession(ctx), ['admin']))
    return jsonError(403, 'forbidden', 'Administrators only.');

  const rows = await listAllUsersForExport(db);
  const csv = toCsv(
    [
      'name',
      'email',
      'roles',
      'plan',
      'plan_until',
      'language',
      'level',
      'email_verified',
      'suspended',
      'created_at',
    ],
    rows.map((r) => [
      r.fullName,
      r.email,
      r.roles.join(' '),
      r.plan ?? '',
      r.periodEnd ?? '',
      r.language,
      r.level,
      r.emailVerified ? 'yes' : 'no',
      r.suspended ? 'yes' : 'no',
      r.createdAt,
    ]),
  );
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="users-${date}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
};

const COURSE_ACTIONS = [
  'course-save',
  'course-hide',
  'course-show',
  'course-delete',
  'course-restore',
  'course-reset',
];

/** Course editor actions (create / edit / hide / show / delete / restore / reset). */
const handleCourseAction = async (
  ctx: Parameters<APIRoute>[0],
  db: D1Database,
  lang: Locale,
  form: FormData,
  actorId: string,
) => {
  const action = String(ctx.params.action);
  const slug = slugSchema.safeParse(form.get('slug'));
  const toList = (status: string) => ctx.redirect(`${routes.adminCourses(lang)}?done=${status}`, 303);
  const toEditor = (courseSlug: string, status: string) =>
    ctx.redirect(`${routes.adminCourse(lang, courseSlug)}?done=${status}`, 303);
  if (!slug.success) return toList('invalid');
  const existing = (await getAdminCourses(db)).find((c) => c.slug === slug.data);
  const back = (status: string) =>
    form.get('from') === 'editor' ? toEditor(slug.data, status) : toList(status);

  if (action === 'course-save') {
    const creating = form.get('mode') === 'create';
    if (creating && (existing || slug.data === 'new')) return toList('slugTaken');
    if (!creating && !existing) return toList('invalid');
    const data = parseCourseForm(form);
    if (!data.success) return creating ? toList('invalid') : toEditor(slug.data, 'invalid');
    await saveCourse(db, slug.data, data.data, form.get('hidden') === '1', actorId);
    return toEditor(slug.data, creating ? 'created' : 'saved');
  }
  if (!existing) return toList('invalid');
  switch (action) {
    case 'course-hide':
    case 'course-show':
      await setCourseHidden(db, slug.data, action === 'course-hide', actorId);
      return back(action === 'course-hide' ? 'hidden' : 'shown');
    case 'course-delete':
      await deleteCourse(db, slug.data, existing.source === 'builtin', actorId);
      return toList('deleted');
    case 'course-restore':
      await restoreCourse(db, slug.data, actorId);
      return toList('restored');
    case 'course-reset':
      if (existing.source !== 'builtin') return back('invalid');
      await resetCourse(db, slug.data, actorId);
      return back('reset');
  }
  return toList('invalid');
};

const LESSON_ACTIONS = [
  'lesson-save',
  'lesson-hide',
  'lesson-show',
  'lesson-delete',
  'lesson-restore',
  'lesson-reset',
];

/** Lesson editor actions; results go back to the course editor (or the lesson editor). */
const handleLessonAction = async (
  ctx: Parameters<APIRoute>[0],
  db: D1Database,
  lang: Locale,
  form: FormData,
  actorId: string,
) => {
  const action = String(ctx.params.action);
  const course = slugSchema.safeParse(form.get('course'));
  const slug = slugSchema.safeParse(form.get('slug'));
  if (!course.success) return ctx.redirect(`${routes.adminCourses(lang)}?done=invalid`, 303);
  const toCourse = (status: string) =>
    ctx.redirect(`${routes.adminCourse(lang, course.data)}?done=${status}#lessons`, 303);
  const toEditor = (lessonSlug: string | null, status: string, extra = '') =>
    ctx.redirect(
      `${routes.adminLesson(lang, course.data, lessonSlug ?? undefined)}?done=${status}${extra}`,
      303,
    );
  const owner = (await getAdminCourses(db)).find((c) => c.slug === course.data && !c.deleted);
  if (!owner || !slug.success) return toCourse('lessonInvalid');
  const id = lessonId(course.data, slug.data);
  const existing = (await getAdminLessons(db)).find((l) => l.id === id);
  const back = (status: string) =>
    form.get('from') === 'editor' ? toEditor(slug.data, status) : toCourse(status);

  if (action === 'lesson-save') {
    const creating = form.get('mode') === 'create';
    if (creating && (existing || slug.data === 'new')) return toEditor(null, 'slugTaken');
    if (!creating && !existing) return toCourse('lessonInvalid');
    const parsed = parseLessonForm(form);
    const target = creating ? null : slug.data;
    if (!parsed.success) {
      if (parsed.badVideo) return toEditor(target, 'badVideo');
      if (parsed.badLines.length) return toEditor(target, 'badItems', `&lines=${parsed.badLines.join(',')}`);
      return toEditor(target, 'invalid');
    }
    await saveLesson(db, course.data, id, parsed.data, form.get('hidden') === '1', actorId);
    return toEditor(slug.data, creating ? 'created' : 'saved');
  }
  if (!existing) return toCourse('lessonInvalid');
  switch (action) {
    case 'lesson-hide':
    case 'lesson-show':
      await setLessonHidden(db, course.data, id, action === 'lesson-hide', actorId);
      return back(action === 'lesson-hide' ? 'lessonHidden' : 'lessonShown');
    case 'lesson-delete':
      await deleteLesson(db, course.data, id, existing.source === 'builtin', actorId);
      return toCourse('lessonDeleted');
    case 'lesson-restore':
      await restoreLesson(db, id, actorId);
      return toCourse('lessonRestored');
    case 'lesson-reset':
      if (existing.source !== 'builtin') return back('lessonInvalid');
      await resetLesson(db, id, actorId);
      return back('lessonReset');
  }
  return toCourse('lessonInvalid');
};

export const POST: APIRoute = async (ctx) => {
  const db = getDb(ctx.locals);
  if (!db) return jsonError(501, 'not_implemented', 'Database not configured.');
  const lang = langOf(ctx.url);

  const session = await loadSession(ctx);
  if (!hasAnyRole(session, ['admin'])) return jsonError(403, 'forbidden', 'Administrators only.');

  const form = await ctx.request.formData();
  if (COURSE_ACTIONS.includes(String(ctx.params.action))) {
    return handleCourseAction(ctx, db, lang, form, session!.userId);
  }
  if (LESSON_ACTIONS.includes(String(ctx.params.action))) {
    return handleLessonAction(ctx, db, lang, form, session!.userId);
  }
  const action = ctx.params.action as Action;
  const schema = schemas[action];
  if (!schema) return jsonError(404, 'bad_request', 'Unknown action.');
  const parsed = schema.safeParse({ ...Object.fromEntries(form), roles: form.getAll('roles') });

  const userId = typeof form.get('userId') === 'string' ? String(form.get('userId')) : '';
  const back = (status: string) =>
    ctx.redirect(
      `${form.get('from') === 'user' && userId ? routes.adminUser(lang, userId) : routes.admin(lang)}?done=${status}`,
      303,
    );
  if (!parsed.success) return back('invalid');
  const actorId = session!.userId;

  switch (action) {
    case 'subscription': {
      const data = parsed.data as Data<'subscription'>;
      await activateManualSubscription(db, data.userId, data.plan, data.months);
      return back('subscription');
    }
    case 'cancel': {
      await cancelSubscriptions(db, (parsed.data as Data<'cancel'>).userId);
      return back('cancel');
    }
    case 'roles': {
      const data = parsed.data as Data<'roles'>;
      if (checkSelfAction(actorId, data.userId, { roles: data.roles })) return back('selfDemote');
      await setUserRoles(db, data.userId, data.roles);
      return back('roles');
    }
    case 'suspend': {
      const target = (parsed.data as Data<'suspend'>).userId;
      if (checkSelfAction(actorId, target, { suspend: true })) return back('selfSuspend');
      await setUserSuspended(db, target, true);
      return back('suspend');
    }
    case 'restore': {
      await setUserSuspended(db, (parsed.data as Data<'restore'>).userId, false);
      return back('restore');
    }
    case 'verify-email': {
      await markEmailVerified(db, (parsed.data as Data<'verify-email'>).userId);
      return back('verifyEmail');
    }
    case 'signout': {
      await deleteUserSessions(db, (parsed.data as Data<'signout'>).userId);
      return back('signout');
    }
    case 'live-create': {
      const data = parsed.data as Data<'live-create'>;
      if (data.courseId && !(await getCourse(data.courseId, db))) return back('invalid');
      await createLiveSession(db, data, actorId);
      return back('liveCreate');
    }
    case 'live-delete': {
      await deleteLiveSession(db, (parsed.data as Data<'live-delete'>).id);
      return back('liveDelete');
    }
  }
};
