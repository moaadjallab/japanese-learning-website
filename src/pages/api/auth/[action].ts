/**
 * /api/auth/* — V1 STUBS. Every known action answers 501 with a structured JSON error.
 * TODO(V2): implement with Better Auth (or Lucia-style sessions) on Cloudflare D1 — see AUTH_PLAN.md.
 */
import type { APIRoute } from 'astro';
import { jsonError, notImplemented } from '@/lib/api/response';

export const prerender = false;

const ACTIONS = [
  'login',
  'register',
  'logout',
  'session',
  'forgot-password',
  'reset-password',
  'verify-email',
] as const;

export const ALL: APIRoute = ({ params }) => {
  if (!ACTIONS.includes(params.action as (typeof ACTIONS)[number])) {
    return jsonError(404, 'bad_request', 'Unknown auth action.');
  }
  // TODO(V2): route to the real handler for `params.action`.
  return notImplemented(`Auth action "${params.action}"`, 'AUTH_PLAN.md (repository)');
};
