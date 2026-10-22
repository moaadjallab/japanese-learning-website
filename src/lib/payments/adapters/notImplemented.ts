import { PaymentsNotAvailableError, type PaymentProvider } from '../types';

/** Default V1 adapter: every operation reports that payments are not available. */
export class NotImplementedPaymentProvider implements PaymentProvider {
  readonly id = 'not-implemented';
  async createCheckoutSession(): Promise<never> {
    throw new PaymentsNotAvailableError('createCheckoutSession');
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
