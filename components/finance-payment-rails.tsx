import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import {
  formatPaymentCollectedVia,
  type PaymentRailTotals,
} from "@/lib/payment-collected";

/** One-line Cash / Thai bank / Stripe (/ Not tagged) split for Finance. */
export function FinancePaymentRails({
  currency,
  totals,
  unit = "baht",
}: {
  currency: PropertyCurrency;
  totals: PaymentRailTotals;
  /** Bill economics store satang; stay accounts store baht. */
  unit?: "baht" | "satang";
}) {
  const toBaht = (amount: number) =>
    unit === "satang" ? Math.round(amount / 100) : amount;
  const rows = (
    [
      ["cash", totals.cash],
      ["thai_bank", totals.thai_bank],
      ["stripe", totals.stripe],
    ] as const
  )
    .map(([rail, amount]) => ({
      label: formatPaymentCollectedVia(rail)!,
      amount: toBaht(amount),
    }))
    .filter((row) => row.amount > 0);
  const untagged = toBaht(totals.untagged);
  if (untagged > 0) {
    rows.push({ label: "Not tagged", amount: untagged });
  }
  if (rows.length === 0) {
    return null;
  }

  return (
    <dl className="staff-sold__rail-grid" aria-label="By payment rail">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd>{formatMoneySuffix(row.amount, currency)}</dd>
        </div>
      ))}
    </dl>
  );
}
