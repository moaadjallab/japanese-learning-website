# Payment provider adapters

Every provider implements `PaymentProvider` (`../types.ts`):

| Method                  | Responsibility                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- |
| `createCheckoutSession` | Create a provider-hosted checkout for a plan and return its URL.                  |
| `handleWebhook`         | **Verify the signature**, then update the subscription (D1 `subscriptions`).      |
| `getSubscriptionStatus` | Used by the success page and (V2) the dashboard to confirm access.                |
| `cancelSubscription`    | Cancel at the end of the current period.                                          |

## Shipped in V1

- `notImplemented.ts`: the default. Every call throws `PaymentsNotAvailableError`.
- `externalLink.ts`: redirects to `CHECKOUT_URL_<PLAN>` when configured. It cannot verify payments.

## Adding a provider (V2)

1. Create `stripe.ts`, `paddle.ts`, `lemonsqueezy.ts`, `paytabs.ts`, ... implementing `PaymentProvider`.
   Call the provider's REST API with `fetch` (Workers-compatible; avoid Node-only SDKs).
2. Add its secrets to `astro.config.mjs` (`env.schema`) and `.env.example`.
3. Select it in `../index.ts` (`getPaymentProvider()`).
4. Implement `src/pages/api/payments/[action].ts` (`checkout-session`, `webhook`, `subscription`, `cancel`).
5. Point the provider's success URL to `/[lang]/checkout/success/?session_id={ID}`. The success page
   calls `getSubscriptionStatus` before showing the confirmation.

Never collect card numbers in our own forms. Always use the provider's hosted page or its embedded,
PCI-compliant fields.
