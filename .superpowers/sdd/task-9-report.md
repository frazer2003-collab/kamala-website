# Task 9 report: Guest payment UI

## Status

Implemented the guest-facing payment rewrite:

- Added `qrcode` and `@types/qrcode`.
- Added a bank transfer panel with an exact-amount PromptPay QR, configured bank account details, and an “I’ve paid” claim action.
- Replaced the Stripe PromptPay checkout with a Bank transfer / Card selector.
- Made configured THB bank transfer the default; card-only checkout remains available when bank transfer is unavailable.
- Added card stay total, 3% bank charge, and total due line items.
- Lazily starts the card PaymentIntent when a guest switches from bank transfer to card.
- Passed public bank transfer settings from the home page through the booking components.
- Added English and Thai checkout copy.
- Redirects successful transfer claims to `/booking/requested` with a calm verification-pending state.

## Verification

- `npx tsc --noEmit`: passed.
- `npm test`: passed, 19 tests.
- Targeted ESLint for the new payment components, requested page, and i18n: passed.
- Automated browser preview could not be completed because the Cursor browser tab service did not retain a navigable tab. The existing Next.js development server was running on port 3000.

## Concerns

- Mobile and desktop visual checks remain to be performed manually.
- The repository still has unrelated pre-existing changes in `app/globals.css`, `app/page.tsx`, `components/home-sticky-dates.tsx`, generated build info, and earlier task artifacts; only Task 9 hunks/files should be included in this commit.
