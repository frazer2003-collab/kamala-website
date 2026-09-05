/**
 * Public Stripe env helpers only — no `stripe` SDK import.
 * Keep server SDK usage in `@/lib/stripe` so guest RSC never loads it.
 */

export function hasStripeClientConfig() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }

  return key;
}
