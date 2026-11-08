import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import type { StaffInsightsSourceMoney } from "@/lib/staff-insights";

function nightLabel(count: number) {
  return count === 1 ? "1 night" : `${count} nights`;
}

function stayLabel(count: number) {
  return count === 1 ? "1 stay" : `${count} stays`;
}

/** Rooms book: money and nights by Website / Walk-in / each OTA. */
export function FinanceBySource({
  currency,
  rows,
}: {
  currency: PropertyCurrency;
  rows: StaffInsightsSourceMoney[];
}) {
  return (
    <section
      className="staff-sold__ledger-panel"
      aria-labelledby="rooms-by-source-title"
    >
      <header className="staff-sold__ledger-head">
        <h2 className="staff-sold__section-title" id="rooms-by-source-title">
          By source / OTA
        </h2>
        {rows.length > 0 ? (
          <p className="staff-sold__ledger-count">
            {rows.length === 1 ? "1 source" : `${rows.length} sources`}
          </p>
        ) : null}
      </header>
      <p className="staff-sold__section-lead">
        Rooms money split for each booking channel. Airbnb, Expedia, and
        Booking.com stay nights with no saved price show as unpriced — they do
        not invent a selling amount.
      </p>
      {rows.length === 0 ? (
        <p className="staff-sold__empty" role="status">
          No stays in this range yet.
        </p>
      ) : (
        <ol className="staff-sold__list" aria-label="Rooms by source">
          {rows.map((row) => {
            const hasMoney =
              row.earnedRevenue > 0 ||
              row.estimatedRevenue > 0 ||
              row.collected > 0 ||
              row.unpaid > 0;
            return (
              <li className="staff-sold__row" key={row.label}>
                <div className="staff-sold__row-main">
                  <h3>{row.label}</h3>
                  <p className="staff-sold__row-stats">
                    <span>{nightLabel(row.nights)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{stayLabel(row.stays)}</span>
                    {row.unpricedNights > 0 ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>
                          {row.unpricedNights === 1
                            ? "1 unpriced night"
                            : `${row.unpricedNights} unpriced nights`}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="staff-sold__row-money">
                  {hasMoney ? (
                    <p>
                      <strong>
                        {formatMoneySuffix(row.earnedRevenue, currency)}
                      </strong>
                      <span>
                        Earned
                        {row.estimatedRevenue > row.earnedRevenue
                          ? ` · in range ${formatMoneySuffix(row.estimatedRevenue, currency)}`
                          : ""}
                      </span>
                      {row.collected > 0 || row.unpaid > 0 ? (
                        <span>
                          Collected {formatMoneySuffix(row.collected, currency)}
                          {row.unpaid > 0
                            ? ` · still to collect ${formatMoneySuffix(row.unpaid, currency)}`
                            : ""}
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="staff-sold__row-money--quiet">
                      <span>
                        {row.unpricedNights > 0
                          ? "No saved price on channel nights"
                          : "No stay total yet"}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
