/**
 * Payment provider abstraction. V1 has NO real payment processing and never simulates one.
 * See PAYMENTS_PLAN.md for provider options (Stripe, Paddle, Lemon Squeezy, PayPal, CMI, Telr, PayTabs…).
 * Card data is NEVER collected by our own forms: providers host their own checkout.
 */
import type { Locale } from '@/i18n/config';
import type { PlanId } from '@/lib/domain/types';

export interface CheckoutSessionRequest {
  plan: PlanId;
  locale: Locale;
  /** Absolute URLs the provider sends the customer back to. */
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  userId?: string;
}

export interface CheckoutSession {
  /** Provider-hosted payment page. */
  url: string;
  /** Provider reference used later to verify the payment (e.g. on the success page). */
  sessionId?: string;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unknown';

export interface SubscriptionInfo {
  status: SubscriptionStatus;
  plan?: PlanId;
  currentPeriodEnd?: string; // ISO 8601
  cancelAtPeriodEnd?: boolean;
}

export interface WebhookResult {
  /** Whether the signature was verified and the event processed. */
  handled: boolean;
  eventType?: string;
}

export interface PaymentProvider {
  readonly id: string;
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CheckoutSession>;
  /** Must verify the provider's signature before trusting the payload. */
  handleWebhook(request: Request): Promise<WebhookResult>;
  getSubscriptionStatus(reference: string): Promise<SubscriptionInfo>;
  cancelSubscription(reference: string): Promise<void>;
}

export class PaymentsNotAvailableError extends Error {
  constructor(operation: string) {
    super(`Payments are not available yet (${operation}).`);
    this.name = 'PaymentsNotAvailableError';
  }
}
