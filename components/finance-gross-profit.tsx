import Link from "next/link";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import type { DeskGrossProfitBreakdown } from "@/lib/desk-expenses";

function bahtFromSatang(satang: number) {
  return Math.round(satang / 100);
}

export function FinanceGrossProfit({
  currency,
  fromIso,
  toIso,
  weekHref,
  monthHref,
  breakdown,
  clearedBillCount,
  expenseCount,
}: {
  currency: PropertyCurrency;
  fromIso: string;
  toIso: string;
  weekHref: string;
  monthHref: string;
  breakdown: DeskGrossProfitBreakdown;
  clearedBillCount: number;
  expenseCount: number;
}) {
  const room = bahtFromSatang(breakdown.roomRevenueSatang);
  const bills = bahtFromSatang(breakdown.billRevenueSatang);
  const expenses = bahtFromSatang(breakdown.expenseSatang);
  const cogs = bahtFromSatang(breakdown.foodDrinkCostSatang);
  const profit = bahtFromSatang(breakdown.grossProfitSatang);
  const revenue = room + bills;
  const costs = expenses + cogs;

  return (
    <section className="staff-sold__ledger-panel" aria-labelledby="gross-profit-title">
      <header className="staff-sold__ledger-head">
        <h2 className="staff-sold__section-title" id="gross-profit-title">
          Gross profit
        </h2>
        <p className="staff-sold__ledger-count">
          <Link href={weekHref}>This week</Link>
          {" · "}
          <Link href={monthHref}>This month</Link>
        </p>
      </header>
      <p className="staff-sold__section-lead">
        Owner-only mix of two businesses: Rooms earned + F&amp;B bill sales,
        minus Expenses page records and food/drink cost. Do not post this total
        to either accountant&apos;s book. Range{" "}
        <strong>
          {fromIso} → {toIso}
        </strong>
        .
      </p>

      <dl className="staff-sold__profit-grid">
        <div>
          <dt>Room revenue</dt>
          <dd>{formatMoneySuffix(room, currency)}</dd>
        </div>
        <div>
          <dt>Bill sales ({clearedBillCount})</dt>
          <dd>{formatMoneySuffix(bills, currency)}</dd>
        </div>
        <div>
          <dt>Expenses recorded ({expenseCount})</dt>
          <dd>
            −{formatMoneySuffix(expenses, currency)}{" "}
            <Link className="staff-sold__quiet-link" href="/staff/expenses">
              Open expenses
            </Link>
          </dd>
        </div>
        <div>
          <dt>Food & drink cost</dt>
          <dd>−{formatMoneySuffix(cogs, currency)}</dd>
        </div>
      </dl>

      <div className="staff-sold__profit-summary">
        <p>
          Revenue {formatMoneySuffix(revenue, currency)}
          <span aria-hidden="true"> · </span>
          Costs {formatMoneySuffix(costs, currency)}
        </p>
        <p className="staff-sold__profit-total">
          <span>Gross profit</span>
          <strong>{formatMoneySuffix(profit, currency)}</strong>
        </p>
      </div>
    </section>
  );
}
