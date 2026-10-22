/**
 * Route-guard helper for future protected areas (/dashboard, /teacher, /admin).
 * Pure function: give it the current session and the roles a route requires;
 * it tells you whether to render or where to redirect. Not used by any V1 page.
 *
 *   // V2, in an on-demand page:
 *   const decision = guardRoute(Astro.locals.session, AREA_ROLES.teacher, lang);
 *   if (!decision.allowed) return Astro.redirect(decision.redirectTo);
 */
import type { Locale } from '@/i18n/config';
import { routes } from '@/lib/routes';
import type { Role, Session } from './types';

/** Roles allowed in each future area. Admins can access everything. */
export const AREA_ROLES = {
  student: ['student', 'admin'],
  teacher: ['teacher', 'admin'],
  admin: ['admin'],
} as const satisfies Record<string, readonly Role[]>;

export type GuardDecision =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'forbidden' | 'expired'; redirectTo: string };

export const hasAnyRole = (session: Session | null | undefined, roles: readonly Role[]): boolean =>
  Boolean(session && session.user.roles.some((role) => roles.includes(role)));

export const guardRoute = (
  session: Session | null | undefined,
  required: readonly Role[],
  lang: Locale,
  now: Date = new Date(),
): GuardDecision => {
  if (!session) return { allowed: false, reason: 'unauthenticated', redirectTo: routes.login(lang) };
  if (new Date(session.expiresAt) <= now)
    return { allowed: false, reason: 'expired', redirectTo: routes.login(lang) };
  if (!hasAnyRole(session, required))
    return { allowed: false, reason: 'forbidden', redirectTo: routes.home(lang) };
  return { allowed: true };
};
