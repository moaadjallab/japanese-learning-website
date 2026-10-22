import type { PlanId } from '@/lib/domain/types';
import {
  PaymentsNotAvailableError,
  type CheckoutSession,
  type CheckoutSessionRequest,
  type PaymentProvider,
} from '../types';

/**
 * Sends customers to a provider-hosted checkout link configured per plan
 * (CHECKOUT_URL_BASIC / _PREMIUM / _PRIVATE), e.g. a Stripe Payment Link or a Paddle / Lemon Squeezy
 * checkout URL. This adapter cannot verify payments, so the success page stays locked until a
 * full provider adapter (with webhooks) is implemented.
 */
export class ExternalLinkPaymentProvider implements PaymentProvider {
  readonly id = 'external-link';
  constructor(private readonly links: Partial<Record<PlanId, string | undefined>>) {}

  /** The configured https URL for a plan, or undefined. */
  linkFor(plan: PlanId): string | undefined {
    const url = this.links[plan];
    return url && /^https:\/\//.test(url) ? url : undefined;
  }

  async createCheckoutSession({ plan }: CheckoutSessionRequest): Promise<CheckoutSession> {
    const url = this.linkFor(plan);
    if (!url) throw new PaymentsNotAvailableError(`no checkout link for plan "${plan}"`);
    return { url };
  }
  async handleWebhook(): Promise<never> {
    throw new PaymentsNotAvailableError('handleWebhook');
  }
  async getSubscriptionStatus(): Promise<never> {
    throw new PaymentsNotAvailableError('getSubscriptionStatus');
  }
  async cancelSubscription(): Promise<never> {
    throw new PaymentsNotAvailableError('cancelSubscription');
  }
}
