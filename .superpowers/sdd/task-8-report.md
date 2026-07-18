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

## Review fixes

- Bank transfer claims now transition the booking from `pending_payment` to `awaiting` before canceling an unused Stripe PaymentIntent. Cancellation is best-effort after the guarded database update.
- Stripe cancellation and expiry webhooks preserve bookings whose status has left `pending_payment` or whose `bank_transfer_claimed_at` is set; the delete repeats both guards atomically.
- Lazy card PaymentIntent attachment now verifies that the guarded booking update matched a row and cancels a newly created orphan intent when it did not.
- The payment shell now renders for a payment step with a null client secret, ready for the bank-transfer UI.

## Review verification

- `npm test` — pass (exit 0): 19 tests passed, 0 failed.
- `npx tsc --noEmit` — pass (exit 0).
