# Task 11 Report: End-to-end verification

**Status:** DONE_WITH_CONCERNS (automated checks pass; live Supabase/Stripe manual checklist pending operator)

## Automated

- `npm test` — 25/25 pass
- `npx tsc --noEmit` — pass
- `npm run lint` — many pre-existing errors outside this feature; one feature-related fix: `prefer-const` in `lib/promptpay.ts`

## Manual checklist (operator)

1. Run `supabase/migrate-bank-transfer-payment.sql` in Supabase
2. Staff Settings: save PromptPay ID + bank account → reload persists
3. Guest: Bank transfer QR + account; amount = stay total
4. I’ve paid → staff inbox claim; dates held; Confirm → calendar
5. Decline claim → dates free
6. Card: line items + Stripe charge ≈ stay × 1.03
7. No Stripe PromptPay UI
8. Clear bank fields → card-only still works

## Concerns

Manual browser / Stripe Dashboard verification was not run in this environment.

## Whole-branch review fixes

- Hardened bank claims against card-payment races by checking Stripe status first,
  matching the PaymentIntent ID in the atomic booking update, and restoring/fulfilling
  the card path if cancellation loses to a completed payment.
- Added capacity validation before a bank transfer can reserve the stay.
- Restricted bank transfer availability to THB on both server and client.
- Corrected PromptPay merchant subtag `02` for 13-digit National/Tax IDs.
- Added `bank_charge_rate` when refreshing existing PaymentIntent metadata.
- `npm test` — 28/28 pass
- `npx tsc --noEmit` — pass
