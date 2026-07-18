# Task 8 Report: Lazy card payment and bank transfer claims

**Status:** DONE  
**Branch:** `feat/bank-transfer-payment`  
**Commit:** `Add bank transfer claim and lazy card payment actions.`

## Summary

Booking requests now store the surcharge-free stay total as `deposit_amount`. Properties with bank transfer details create the pending booking without a Stripe PaymentIntent, while card-only properties retain immediate card checkout at the surcharge-inclusive amount.

Added actions to lazily create or update a card-only PaymentIntent, claim a bank transfer while canceling any unused card intent and notifying staff, and mark a claimed bank transfer paid when staff confirms it. The guest payment state now accepts a null client secret, and the legacy Stripe PromptPay path is restricted to cards.

## Files changed

- `app/actions.ts` — lazy card PaymentIntent, bank claim, corrected booking totals, and confirmation payment timestamp
- `components/booking-request.tsx` — nullable payment client secret flow
- `components/booking-payment-element.tsx` — card-only legacy Stripe payment method

## Verification

- `npx tsc --noEmit` — pass (exit 0)
- Existing unit tests — 17 passed, 0 failed
