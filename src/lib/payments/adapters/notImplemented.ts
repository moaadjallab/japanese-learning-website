import { PaymentsNotAvailableError, type CheckoutSessionRequest, type PaymentProvider } from '../types';

/** Default V1 adapter: every operation reports that payments are not available. */
export class NotImplementedPaymentProvider implements PaymentProvider {
  readonly id = 'not-implemented';
  async createCheckoutSession(_request: CheckoutSessionRequest): Promise<never> {
    throw new PaymentsNotAvailableError('createCheckoutSession');
  }
  async handleWebhook(_request: Request): Promise<never> {
    throw new PaymentsNotAvailableError('handleWebhook');
  }
  async getSubscriptionStatus(_reference: string): Promise<never> {
    throw new PaymentsNotAvailableError('getSubscriptionStatus');
  }
  async cancelSubscription(_reference: string): Promise<never> {
    throw new PaymentsNotAvailableError('cancelSubscription');
  }
}
