export function canCleanupPendingBooking({
  status,
  bankTransferClaimedAt,
}: {
  status: string;
  bankTransferClaimedAt: string | null;
}) {
  return status === "pending_payment" && bankTransferClaimedAt === null;
}
