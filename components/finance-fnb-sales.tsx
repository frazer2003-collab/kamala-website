import Link from "next/link";
import { FinancePaymentRails } from "@/components/finance-payment-rails";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import type { DeskClearedBillEconomics } from "@/lib/desk-ops-data";

function bahtFromSatang(satang: number) {
  return Math.round(satang / 100);
}

/** F&B accounting stream: cleared desk bills for the Finance date range. */
export function FinanceFnBSales({
  currency,
  fromIso,
  toIso,
  economics,
}: {
  currency: PropertyCurrency;
  fromIso: string;
  toIso: string;
  economics: DeskClearedBillEconomics;
}) {
  const sales = bahtFromSatang(economics.billRevenueSatang);
  const cost = bahtFromSatang(economics.foodDrinkCostSatang);
  const contribution = sales - cost;
  const hasSales = economics.clearedBillCount > 0 || sales > 0;

  return (
    <section
      className="staff-sold__ledger-panel staff-sold__stream-panel"
      aria-labelledby="fnb-sales-title"
    >
      <header className="staff-sold__ledger-head">
        <h2 className="staff-sold__section-title" id="fnb-sales-title">
          F&amp;B sales
        </h2>
        <p className="staff-sold__ledger-count">
          <Link href="/staff/bills">Open Bills</Link>
        </p>
      </header>
      <p className="staff-sold__section-lead">
        Cleared food &amp; drink bills for{" "}
        <strong>
          {fromIso} → {toIso}
        </strong>
        . Separate accounting account from room stays. Cleared bills tag Cash,
        Thai bank, or Stripe.
      </p>

      {!hasSales ? (
        <p className="staff-sold__empty" role="status">
          No cleared bills in this range yet.
        </p>
      ) : (
        <>
          <p className="staff-sold__total">
            <span className="staff-sold__total-value">
              {formatMoneySuffix(sales, currency)}
            </span>
          </p>
          <dl className="staff-sold__profit-grid">
            <div>
              <dt>Cleared bills</dt>
              <dd>
                {economics.clearedBillCount === 1
                  ? "1 bill"
                  : `${economics.clearedBillCount} bills`}
                {economics.lineCount > 0
                  ? ` · ${economics.lineCount} line${economics.lineCount === 1 ? "" : "s"}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>Food &amp; drink cost</dt>
              <dd>−{formatMoneySuffix(cost, currency)}</dd>
            </div>
            <div>
              <dt>Contribution</dt>
              <dd>{formatMoneySuffix(contribution, currency)}</dd>
            </div>
          </dl>
          <FinancePaymentRails
            currency={currency}
            totals={economics.revenueByRail}
            unit="satang"
          />
        </>
      )}
    </section>
  );
}
