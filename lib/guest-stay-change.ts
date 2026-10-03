import { calculateStripeChargeAmount } from "@/lib/payment-pricing";

/** How the guest paid for the stay they are changing. */
export type StayChangePayment = "card" | "bank" | "unpaid";

/** How the guest pays the extra for a dearer stay — same choice as checkout. */
export type StayChangePayMethod = "card" | "bank";

export type StayChangeCardCharge = { surcharge: number; totalDue: number };

export type StayChangeOutcome =
  | { kind: "same"; newTotal: number }
  | { kind: "unpaid"; newTotal: number }
  | {
      kind: "pay-more";
      newTotal: number;
      difference: number;
      /** Null when card payments are off or the charge is under the processor minimum. */
      card: StayChangeCardCharge | null;
      bank: boolean;
      /** Method shown first: how they paid for the stay, when still offered. */
      preferred: StayChangePayMethod | null;
    }
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
 * What changing the stay costs or returns. Extra money can be paid by card
 * (with the card fee on the extra only) or bank transfer, like checkout.
 * A refund returns the stay difference on the rail they paid with, not the old fee.
 * A tiny extra that only a card could take, but is under the card minimum, is waived.
 */
export function resolveStayChangeOutcome({
  currentTotal,
  newTotal,
  payment,
  minimumCardCharge = 0,
  cardAvailable = true,
  bankAvailable = true,
}: {
  currentTotal: number;
  newTotal: number;
  payment: StayChangePayment;
  minimumCardCharge?: number;
  cardAvailable?: boolean;
  bankAvailable?: boolean;
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
    const charge = calculateStripeChargeAmount(difference);
    const underMinimum = charge.totalDue < minimumCardCharge;
    const card =
      cardAvailable && !underMinimum
        ? { surcharge: charge.surcharge, totalDue: charge.totalDue }
        : null;

    if (!card && !bankAvailable && cardAvailable && underMinimum) {
      return { kind: "same", newTotal: next };
    }

    const preferred: StayChangePayMethod | null =
      payment === "card" && card
        ? "card"
        : payment === "bank" && bankAvailable
          ? "bank"
          : bankAvailable
            ? "bank"
            : card
              ? "card"
              : null;

    return {
      kind: "pay-more",
      newTotal: next,
      difference,
      card,
      bank: bankAvailable,
      preferred,
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
  method?: StayChangePayMethod,
): { sentence: string; action: string } {
  switch (outcome.kind) {
    case "same":
      return { sentence: "No extra to pay.", action: "Update stay" };
    case "unpaid":
      return {
        sentence: `Your new total is ${formatAmount(outcome.newTotal)}.`,
        action: "Update stay",
      };
    case "pay-more": {
      const payBy = method ?? outcome.preferred;
      if (payBy === "card" && outcome.card) {
        return {
          sentence: `Pay ${formatAmount(outcome.difference)} more, plus a ${formatAmount(outcome.card.surcharge)} card fee.`,
          action: `Pay ${formatAmount(outcome.card.totalDue)}`,
        };
      }
      return {
        sentence: `Transfer ${formatAmount(outcome.difference)} more. Your dates change once we see it.`,
        action: `I've sent ${formatAmount(outcome.difference)}`,
      };
    }
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
