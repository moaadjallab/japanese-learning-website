/**
 * /api/learning/* — student actions, sent as plain HTML form posts (work without JavaScript).
 *   POST enroll    course
 *   POST progress  course, lesson, completed=1|0
 * Every action checks the session AND the student's plan before touching the database.
 * Responds with a 303 redirect back to the localized student page.
 */
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { isLocale, type Locale } from '@/i18n/config';
import { jsonError } from '@/lib/api/response';
import { getDb, loadSession } from '@/lib/auth/server';
import { canAccessCourse } from '@/lib/learning/access';
import { enroll, getActiveSubscription, setLessonCompleted } from '@/lib/learning/server';
import { getCourse } from '@/lib/repositories/courses';
import { getLesson } from '@/lib/repositories/lessons';
import { routes } from '@/lib/routes';

export const prerender = false;

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);
const enrollSchema = z.object({ course: slug });
const progressSchema = z.object({ course: slug, lesson: slug, completed: z.enum(['0', '1']) });

export const POST: APIRoute = async (ctx) => {
  const db = getDb(ctx.locals);
  if (!db) return jsonError(501, 'not_implemented', 'Database not configured.');
  const langParam = ctx.url.searchParams.get('lang');
  const lang: Locale = isLocale(langParam) ? langParam : 'en';

  const session = await loadSession(ctx);
  if (!session)
    return ctx.redirect(`${routes.login(lang)}?next=${encodeURIComponent(routes.dashboard(lang))}`, 303);

  const form = Object.fromEntries(await ctx.request.formData());
  const subscription = await getActiveSubscription(db, session.userId);

  if (ctx.params.action === 'enroll') {
    const parsed = enrollSchema.safeParse(form);
    if (!parsed.success) return jsonError(400, 'validation_error', 'Invalid input.');
    const course = await getCourse(parsed.data.course, db);
    if (!course) return jsonError(404, 'bad_request', 'Unknown course.');
    if (!canAccessCourse(subscription?.plan ?? null, course.plans)) {
      return ctx.redirect(routes.dashboardCourse(lang, course.slug), 303);
    }
    await enroll(db, session.userId, course.slug);
    return ctx.redirect(routes.dashboardCourse(lang, course.slug), 303);
  }

  if (ctx.params.action === 'progress') {
    const parsed = progressSchema.safeParse(form);
    if (!parsed.success) return jsonError(400, 'validation_error', 'Invalid input.');
    const { course: courseSlug, lesson: lessonSlug, completed } = parsed.data;
    const [course, lesson] = await Promise.all([getCourse(courseSlug, db), getLesson(courseSlug, lessonSlug, db)]);
    if (!course || !lesson) return jsonError(404, 'bad_request', 'Unknown lesson.');
    if (!canAccessCourse(subscription?.plan ?? null, course.plans)) {
      return jsonError(403, 'forbidden', 'Your plan does not include this course.');
    }
    await setLessonCompleted(db, session.userId, course.slug, lesson.id, completed === '1');
    return ctx.redirect(routes.dashboardLesson(lang, course.slug, lesson.slug), 303);
  }

  return jsonError(404, 'bad_request', 'Unknown action.');
};
