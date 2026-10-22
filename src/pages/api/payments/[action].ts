/**
 * /api/payments/* — V1 STUBS (501). No payment is ever simulated.
 * TODO(V2): implement with the chosen provider adapter. See PAYMENTS_PLAN.md and
 * src/lib/payments/adapters/README.md.
 *   POST checkout-session  → create a provider checkout session for a plan
 *   POST webhook           → verify signature, update the subscription
 *   GET  subscription      → current subscription status
 *   POST cancel            → cancel at period end
 */
import type { APIRoute } from 'astro';
import { jsonError, notImplemented } from '@/lib/api/response';

export const prerender = false;

const ACTIONS = ['checkout-session', 'webhook', 'subscription', 'cancel'] as const;

export const ALL: APIRoute = ({ params }) => {
  if (!ACTIONS.includes(params.action as (typeof ACTIONS)[number])) {
    return jsonError(404, 'bad_request', 'Unknown payments action.');
  }
  return notImplemented(`Payments action "${params.action}"`, 'PAYMENTS_PLAN.md (repository)');
};
