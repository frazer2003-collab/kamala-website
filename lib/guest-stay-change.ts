import { calculateStripeChargeAmount } from "@/lib/payment-pricing";

/** How the guest paid for the stay they are changing. */
export type StayChangePayment = "card" | "bank" | "unpaid";

export type StayChangeOutcome =
  | { kind: "same"; newTotal: number }
  | { kind: "unpaid"; newTotal: number }
  | {
      kind: "pay-card";
      newTotal: number;
      difference: number;
      surcharge: number;
      totalDue: number;
    }
  | { kind: "pay-bank"; newTotal: number; difference: number }
  | { kind: "refund-card"; newTotal: number; difference: number }
  | { kind: "refund-bank"; newTotal: number; difference: number };

export type StayChangeEligibility =
  | { ok: true }
  | { ok: false; reason: "not-confirmed" | "stay-started" | "change-pending" };

export function resolveStayChangePayment(booking: {
  depositPaidAt: string | null;
  stripePaymentIntentId: string | null;
}): StayChangePayment {
  if (!booking.depositPaidAt) {
    return "unpaid";
  }
  return booking.stripePaymentIntentId ? "card" : "bank";
}

/** Guests may change a confirmed stay until the day they arrive. */
export function canGuestChangeStay({
  status,
  arrivalDate,
  todayIso,
  hasPendingChange,
}: {
  status: string;
  arrivalDate: string;
  todayIso: string;
  hasPendingChange: boolean;
}): StayChangeEligibility {
  if (status !== "confirmed") {
    return { ok: false, reason: "not-confirmed" };
  }
  if (arrivalDate <= todayIso) {
    return { ok: false, reason: "stay-started" };
  }
  if (hasPendingChange) {
    return { ok: false, reason: "change-pending" };
  }
  return { ok: true };
}

export function isSameStay(
  current: { roomId: string; arrivalDate: string; departureDate: string },
  next: { roomId: string; arrivalDate: string; departureDate: string },
) {
  return (
    current.roomId === next.roomId &&
    current.arrivalDate === next.arrivalDate &&
    current.departureDate === next.departureDate
  );
}

/**
 * What changing the stay costs or returns. The card fee applies only to the
 * extra amount charged; a refund returns the stay difference, not the old fee.
 * Card top-ups under the processor minimum are waived rather than blocked.
 */
export function resolveStayChangeOutcome({
  currentTotal,
  newTotal,
  payment,
  minimumCardCharge = 0,
}: {
  currentTotal: number;
  newTotal: number;
  payment: StayChangePayment;
  minimumCardCharge?: number;
}): StayChangeOutcome {
  const current = Math.max(0, Math.round(currentTotal));
  const next = Math.max(0, Math.round(newTotal));
  const difference = next - current;

  if (payment === "unpaid") {
    return { kind: "unpaid", newTotal: next };
  }

  if (difference === 0) {
    return { kind: "same", newTotal: next };
  }

  if (difference > 0) {
    if (payment === "bank") {
      return { kind: "pay-bank", newTotal: next, difference };
    }
    const charge = calculateStripeChargeAmount(difference);
    if (charge.totalDue < minimumCardCharge) {
      return { kind: "same", newTotal: next };
    }
    return {
      kind: "pay-card",
      newTotal: next,
      difference,
      surcharge: charge.surcharge,
      totalDue: charge.totalDue,
    };
  }

  return payment === "card"
    ? { kind: "refund-card", newTotal: next, difference: -difference }
    : { kind: "refund-bank", newTotal: next, difference: -difference };
}

/** One plain sentence about money, and the label for the single button. */
export function describeStayChangeOutcome(
  outcome: StayChangeOutcome,
  formatAmount: (amount: number) => string,
): { sentence: string; action: string } {
  switch (outcome.kind) {
    case "same":
      return { sentence: "No extra to pay.", action: "Update stay" };
    case "unpaid":
      return {
        sentence: `Your new total is ${formatAmount(outcome.newTotal)}.`,
        action: "Update stay",
      };
    case "pay-card":
      return {
        sentence: `Pay ${formatAmount(outcome.difference)} more, plus a ${formatAmount(outcome.surcharge)} card fee.`,
        action: `Pay ${formatAmount(outcome.totalDue)}`,
      };
    case "pay-bank":
      return {
        sentence: `Transfer ${formatAmount(outcome.difference)} more. Your dates change once we see it.`,
        action: `I've sent ${formatAmount(outcome.difference)}`,
      };
    case "refund-card":
      return {
        sentence: `We refund ${formatAmount(outcome.difference)} to your card.`,
        action: "Update stay",
      };
    case "refund-bank":
      return {
        sentence: `We will refund ${formatAmount(outcome.difference)} by bank transfer.`,
        action: "Update stay",
      };
  }
}
