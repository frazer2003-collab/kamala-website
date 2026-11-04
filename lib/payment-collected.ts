export const PAYMENT_COLLECTED_VIA = ["cash", "thai_bank"] as const;

export type PaymentCollectedVia = (typeof PAYMENT_COLLECTED_VIA)[number];

export function parsePaymentCollectedVia(
  value: string | null | undefined,
): PaymentCollectedVia | null {
  if (value === "cash" || value === "thai_bank") {
    return value;
  }
  return null;
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
  return null;
}

/** Label for staff UI: Card / Cash / Thai bank / Paid. */
export function formatStaffPaidLabel(options: {
  depositPaid: boolean;
  paidByCard: boolean;
  paymentCollectedVia?: PaymentCollectedVia | null;
}) {
  if (!options.depositPaid) {
    return "Unpaid";
  }
  if (options.paidByCard) {
    return "Paid · Card";
  }
  const via = formatPaymentCollectedVia(options.paymentCollectedVia);
  return via ? `Paid · ${via}` : "Paid";
}
