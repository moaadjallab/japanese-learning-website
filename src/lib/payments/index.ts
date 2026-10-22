/**
 * Payment provider selection (server-only: reads secrets from astro:env/server).
 * V1: optional external checkout links; no provider able to verify payments yet.
 */
import { CHECKOUT_URL_BASIC, CHECKOUT_URL_PREMIUM, CHECKOUT_URL_PRIVATE } from 'astro:env/server';
import { ExternalLinkPaymentProvider } from './adapters/externalLink';
import { NotImplementedPaymentProvider } from './adapters/notImplemented';
import type { PaymentProvider } from './types';

export * from './types';

export const getCheckoutLinkProvider = () =>
  new ExternalLinkPaymentProvider({
    basic: CHECKOUT_URL_BASIC,
    premium: CHECKOUT_URL_PREMIUM,
    private: CHECKOUT_URL_PRIVATE,
  });

/** The provider able to *verify* payments. None in V1. */
export const getPaymentProvider = (): PaymentProvider => new NotImplementedPaymentProvider();
