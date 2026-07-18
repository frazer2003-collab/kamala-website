# Task 10 report: Staff inbox / decide UX

## Status

Implemented staff handling for bank transfer claims:

- Mapped `bank_transfer_claimed_at` to `StaffBooking.bankTransferClaimed`.
- Kept awaiting bookings visible when either a deposit is paid or a bank transfer is claimed.
- Added distinct “Transfer to verify” inbox and payment-detail copy.
- Added decision guidance telling staff to verify the transfer in their bank app before confirming or declining.
- Added focused regression coverage for claim mapping and inbox visibility.

## Verification

- `npx tsx --test lib/booking-requests.test.ts`: passed, 2 tests.
- `npx tsc --noEmit`: passed.

## Concerns

- None identified within Task 10 scope.
