/**
 * Shared loader for student-space pages: validates the locale, requires a signed-in user,
 * and fetches the active subscription. Returns either the context or a redirect Response.
 */
import type { AstroGlobal } from 'astro';
import { isLocale, type Locale } from '@/i18n/config';
import { AREA_ROLES, guardRoute } from '@/lib/auth/guard';
import { getDb } from '@/lib/auth/server';
import type { User } from '@/lib/auth/types';
import { routes } from '@/lib/routes';
import { getActiveSubscription, type ActiveSubscription } from './server';

export interface StudentContext {
  lang: Locale;
  user: User;
  db: D1Database;
  subscription: ActiveSubscription | null;
}

export const loadStudentContext = async (
  Astro: AstroGlobal,
  roles: readonly User['roles'][number][] = AREA_ROLES.student,
): Promise<StudentContext | Response> => {
  const lang = isLocale(Astro.params.lang) ? Astro.params.lang : 'en';
  const decision = guardRoute(Astro.locals.session, roles, lang);
  if (!decision.allowed) {
    const target =
      decision.reason === 'forbidden'
        ? routes.dashboard(lang)
        : `${decision.redirectTo}?next=${encodeURIComponent(Astro.url.pathname)}`;
    return Astro.redirect(target);
  }
  const db = getDb(Astro.locals);
  if (!db) return new Response('Database not configured', { status: 501 });
  const user = Astro.locals.session!.user;
  Astro.response.headers.set('Cache-Control', 'private, no-store');
  return { lang, user, db, subscription: await getActiveSubscription(db, user.id) };
};
