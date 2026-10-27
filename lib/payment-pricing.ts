export const STRIPE_BANK_CHARGE_RATE = 0.06;

export function resolveBookingStayTotal(booking: {
  depositAmount: number | null | undefined;
  estimatedTotal: number;
}) {
  return Math.max(0, Math.round(booking.depositAmount ?? booking.estimatedTotal));
}

export function calculateStripeChargeAmount(stayTotal: number) {
  const base = Math.max(0, Math.round(stayTotal));
  const totalDue = Math.max(1, Math.round(base * (1 + STRIPE_BANK_CHARGE_RATE)));
  const surcharge = totalDue - base;
  return { stayTotal: base, surcharge, totalDue };
}

/**
 * Refund the stay and leave the card's bank charge on the payment.
 * Amounts are in the currency's minor units (satang for THB).
 * A stay of 0 has no known charge, so the remaining card payment is refunded.
 */
export function cardRefundKeepingCharge({
  amountReceivedMinor,
  alreadyRefundedMinor,
  stayTotalMajor,
  keepBankCharge = true,
}: {
  amountReceivedMinor: number;
  alreadyRefundedMinor: number;
  stayTotalMajor: number;
  /** False refunds the bank charge as well. Staff use that for a special case. */
  keepBankCharge?: boolean;
}):
  | { action: "refund"; amountMinor: number; keptChargeMinor: number }
  | { action: "done"; keptChargeMinor: number } {
  const received = Math.max(0, Math.round(amountReceivedMinor));
  const refunded = Math.max(0, Math.round(alreadyRefundedMinor));

  if (!keepBankCharge) {
    const remaining = received - refunded;
    if (remaining <= 0) {
      return { action: "done", keptChargeMinor: 0 };
    }
    return { action: "refund", amountMinor: remaining, keptChargeMinor: 0 };
  }

  const stayMinor = Math.max(0, Math.round(stayTotalMajor)) * 100;

  if (stayMinor <= 0) {
    const remaining = received - refunded;
    if (remaining <= 0) {
      return { action: "done", keptChargeMinor: 0 };
    }
    return { action: "refund", amountMinor: remaining, keptChargeMinor: 0 };
  }

  const refundable = Math.min(stayMinor, received);
  const keptChargeMinor =
    refunded >= received && received > 0 ? 0 : Math.max(0, received - refundable);
  const remainingStay = refundable - refunded;
  const remainingOnCard = received - refunded;

  if (remainingStay <= 0 || remainingOnCard <= 0) {
    return { action: "done", keptChargeMinor };
  }

  return {
    action: "refund",
    amountMinor: Math.min(remainingStay, remainingOnCard),
    keptChargeMinor,
  };
}
