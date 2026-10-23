import { describe, expect, it } from 'vitest';
import { ExternalLinkPaymentProvider } from '@/lib/payments/adapters/externalLink';
import { NotImplementedPaymentProvider } from '@/lib/payments/adapters/notImplemented';
import { PaymentsNotAvailableError } from '@/lib/payments/types';

describe('payment adapters (V1)', () => {
  it('never simulates a payment', async () => {
    const provider = new NotImplementedPaymentProvider();
    await expect(provider.getSubscriptionStatus('cs_123')).rejects.toBeInstanceOf(PaymentsNotAvailableError);
  });
  it('only uses configured https checkout links', async () => {
    const provider = new ExternalLinkPaymentProvider({
      basic: 'https://pay.example.com/b',
      premium: 'javascript:alert(1)',
    });
    expect(provider.linkFor('basic')).toBe('https://pay.example.com/b');
    expect(provider.linkFor('premium')).toBeUndefined();
    expect(provider.linkFor('private')).toBeUndefined();
    await expect(
      provider.createCheckoutSession({ plan: 'private', locale: 'en', successUrl: '', cancelUrl: '' }),
    ).rejects.toBeInstanceOf(PaymentsNotAvailableError);
  });
});
