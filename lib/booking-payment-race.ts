export function canCleanupPendingBooking({
  status,
  bankTransferClaimedAt,
}: {
  status: string;
  bankTransferClaimedAt: string | null;
}) {
  return status === "pending_payment" && bankTransferClaimedAt === null;
}

export type BankClaimCardError = "card_already_paid" | "card_processing";

export function getBankClaimCardError(
  paymentIntentStatus: string,
): BankClaimCardError | null {
  if (paymentIntentStatus === "succeeded") return "card_already_paid";
  if (paymentIntentStatus === "processing") return "card_processing";
  return null;
}
