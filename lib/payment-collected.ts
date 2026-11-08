export const PAYMENT_COLLECTED_VIA = ["cash", "thai_bank", "stripe"] as const;

export type PaymentCollectedVia = (typeof PAYMENT_COLLECTED_VIA)[number];

/** Money totals split by how payment moved (plus untagged legacy rows). */
export type PaymentRailTotals = Record<PaymentCollectedVia, number> & {
  untagged: number;
};

export function emptyPaymentRailTotals(): PaymentRailTotals {
  return { cash: 0, thai_bank: 0, stripe: 0, untagged: 0 };
}

export function parsePaymentCollectedVia(
  value: string | null | undefined,
): PaymentCollectedVia | null {
  if (value === "cash" || value === "thai_bank" || value === "stripe") {
    return value;
  }
  return null;
}

/**
 * Resolve the bookkeeping rail for a paid stay.
 * Explicit staff mark wins; Stripe PI / OTA card land in Stripe.
 */
export function resolveStayPaymentRail(options: {
  depositPaid: boolean;
  paymentCollectedVia?: PaymentCollectedVia | null;
  stripePaymentIntentId?: string | null;
  paidViaOta?: boolean;
}): PaymentCollectedVia | null {
  if (!options.depositPaid) {
    return null;
  }
  if (options.paymentCollectedVia) {
    return options.paymentCollectedVia;
  }
  if (options.stripePaymentIntentId || options.paidViaOta) {
    return "stripe";
  }
  return null;
}

export function addToPaymentRail(
  totals: PaymentRailTotals,
  rail: PaymentCollectedVia | null,
  amount: number,
) {
  if (amount === 0) {
    return;
  }
  if (rail) {
    totals[rail] += amount;
  } else {
    totals.untagged += amount;
  }
}

export function formatPaymentCollectedVia(
  value: PaymentCollectedVia | null | undefined,
): string | null {
  if (value === "cash") {
    return "Cash";
  }
  if (value === "thai_bank") {
    return "Thai bank";
  }
  if (value === "stripe") {
    return "Stripe";
  }
  return null;
}

/** Label for staff UI: Card / Cash / Thai bank / Stripe / Paid. */
export function formatStaffPaidLabel(options: {
  depositPaid: boolean;
  paidByCard: boolean;
  /** OTA channel stays are always card — same badge as Stripe. */
  paidViaOta?: boolean;
  paymentCollectedVia?: PaymentCollectedVia | null;
}) {
  if (!options.depositPaid) {
    return "Unpaid";
  }
  if (options.paymentCollectedVia === "stripe") {
    return "Paid · Stripe";
  }
  if (options.paidByCard || options.paidViaOta) {
    return "Paid · Card";
  }
  const via = formatPaymentCollectedVia(options.paymentCollectedVia);
  return via ? `Paid · ${via}` : "Paid";
}
