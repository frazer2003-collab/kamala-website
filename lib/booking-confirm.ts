/**
 * When staff confirm a request from the inbox, decide whether that confirmation
 * also records payment, and as of when.
 *
 * Confirm is only offered on an unpaid bank-transfer stay behind "I verified
 * this transfer in the bank app", so confirming one is the record that the money
 * arrived:
 * - already paid by card: keep the original paid time
 * - guest tapped "I've paid": use their claim time
 * - guest never tapped it: stamp the moment staff verified it
 * - no checkout behind the request (legacy "new" stays): leave unpaid so staff
 *   still collect at arrival
 */
export function resolveConfirmPaidAt({
  status,
  depositPaidAt,
  bankTransferClaimedAt,
  now,
}: {
  status: string;
  depositPaidAt: string | null;
  bankTransferClaimedAt: string | null;
  now: string;
}): string | null {
  if (depositPaidAt) {
    return depositPaidAt;
  }

  if (bankTransferClaimedAt) {
    return bankTransferClaimedAt;
  }

  return status === "pending_payment" ? now : null;
}
