# Payments plan

V1 contains **no payment processing and never simulates a payment**.

- The checkout page (`/[lang]/checkout/?plan=basic|premium|private`) shows the plan, monthly price, features,
  amount, billing frequency, subscription conditions, cancellation information and a payment-method section.
- **Confirm Subscription** either sends the visitor to a provider-hosted checkout link
  (`CHECKOUT_URL_BASIC` / `_PREMIUM` / `_PRIVATE`, https only) or shows "Online payments are being activated".
- The success page is only rendered after the provider **confirms** an active subscription; in V1 it
  redirects to Pricing (design preview: `/en/checkout/success/?preview=1` in dev only).
- Card data is never collected or stored by our forms.

Code: `src/lib/payments/` (`PaymentProvider` interface with `createCheckoutSession`, `handleWebhook`,
`getSubscriptionStatus`, `cancelSubscription`; adapters in `adapters/`), API stubs in
`src/pages/api/payments/[action].ts`, D1 tables `subscriptions` and `payment_events` in `db/migrations/0001_initial_schema.sql`.

---

## Important: verify eligibility first

> Provider availability, supported business countries, payout countries and merchant-account
> eligibility **change often** and depend on where your business is registered. **Before choosing,
> confirm with each provider (and your bank) that a business registered in Morocco, or wherever you
> register, can sign up, receive payouts and sell subscriptions to customers in Morocco and the Gulf.**
> The table below is a starting point based on general knowledge, not a guarantee.

## Options for a business targeting Morocco and the Gulf

| Provider                                 | Model                                                                                     | Subscriptions                                     | Strengths                                                                                                                     | Points to verify / limits                                                                                                                                                             |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paddle**                               | Merchant of Record (MoR)                                                                  | Yes (native)                                      | Handles global VAT/sales tax, invoices, refunds and chargebacks; cards, PayPal, Apple/Google Pay; hosted or overlay checkout. | Seller approval process; supported seller and payout countries (check Morocco); fee around 5% + $0.50 per transaction.                                                                |
| **Lemon Squeezy**                        | MoR (owned by Stripe since 2024)                                                          | Yes                                               | Simple setup, hosted checkout, tax handling, good for digital products and courses.                                           | Seller/payout country support (check Morocco); product roadmap is moving toward Stripe; fee around 5% + $0.50.                                                                        |
| **Stripe**                               | Payment processor (you are the merchant)                                                  | Yes (Billing)                                     | Best developer experience; Payment Links work with `CHECKOUT_URL_*` today; UAE supported.                                     | **Not available to businesses registered in Morocco** at the time of writing; needs an entity in a supported country (e.g. UAE, EU, US). You handle tax yourself (or use Stripe Tax). |
| **Whop**                                 | Marketplace / MoR-style platform                                                          | Yes (memberships)                                 | Very fast to start for paid communities and courses; handles checkout and access.                                             | Platform fees and branding; less control over UX and data; payout options to verify.                                                                                                  |
| **PayPal**                               | Wallet + cards                                                                            | Yes (subscriptions API)                           | Widely known by buyers in the region.                                                                                         | Moroccan account capabilities (receiving payments, withdrawals to a Moroccan bank) **must be verified**; higher dispute risk; cross-border fees.                                      |
| **CMI** (Centre Monétique Interbancaire) | Moroccan acquirer                                                                         | Limited, check recurring and tokenization support | Accepts Moroccan cards in MAD; local trust; required for many local buyers.                                                   | Requires a Moroccan company and a bank merchant agreement; integration via bank; recurring billing support varies.                                                                    |
| **Telr**                                 | Gateway (UAE-based)                                                                       | Yes (recurring)                                   | Strong in the GCC; cards, Apple Pay, local methods; multi-currency.                                                           | Usually requires a GCC entity (e.g. UAE); onboarding/KYC.                                                                                                                             |
| **PayTabs**                              | Gateway (KSA/UAE/Egypt…)                                                                  | Yes (tokenization/recurring)                      | mada (KSA), Apple Pay, local GCC methods; Arabic-friendly.                                                                    | Entity and settlement country requirements; per-country fees.                                                                                                                         |
| Also worth checking                      | **Tap Payments** (KNET, mada, Benefit), **HyperPay** (KSA), **Checkout.com** (enterprise) |                                                   | Regional payment methods in the Gulf.                                                                                         | Entity/volume requirements.                                                                                                                                                           |

### Recommendation

1. **Fastest path from Morocco:** a **Merchant of Record** (Paddle or Lemon Squeezy) _if_ they accept your
   business and pay out to your bank. They take on VAT/sales tax and invoicing across countries, which matters
   when selling to the EU, the Gulf and elsewhere. Integrate via hosted checkout + webhooks.
2. **If you have (or create) a UAE/EU entity:** Stripe Billing (or Tap/Telr/PayTabs for GCC-local methods
   such as mada and KNET) for lower fees and full control, plus your own tax handling.
3. **For Moroccan customers paying in MAD:** add **CMI** later through a Moroccan bank, if recurring billing
   (or a manual monthly renewal flow) is supported.
4. **Interim option (works today):** create provider-hosted payment links and set `CHECKOUT_URL_*`. Payments
   then happen entirely on the provider's page; access is granted manually until webhooks are implemented.

## Integration checklist (V2)

1. Implement an adapter in `src/lib/payments/adapters/` (see the README there) and select it in `getPaymentProvider()`.
2. `POST /api/payments/checkout-session`: create a session for the logged-in user's chosen plan and return the hosted URL.
3. `POST /api/payments/webhook`: **verify the signature**, store the event id in `payment_events` (idempotency),
   upsert `subscriptions`, send the welcome email.
4. Success URL: `/[lang]/checkout/success/?session_id={ID}`. The page calls `getSubscriptionStatus()` before rendering.
5. Customer portal / cancellation: provider-hosted portal or `cancelSubscription()` (cancel at period end).
6. Set real prices in `src/content/plans.json` (or D1 `plans.price_minor`) **matching the provider's prices**,
   and finalize the Refund Policy and Terms with a lawyer.
7. Update the CSP (`src/lib/security/headers.js`) if the provider needs embedded scripts or iframes
   (not needed for redirect-based hosted checkout).
