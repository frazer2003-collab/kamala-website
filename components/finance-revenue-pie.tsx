import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";

export type FinanceRevenueSlice = {
  roomId: string;
  roomName: string;
  amount: number;
};

/** Calm hospitality swatches — labels carry identity; color is secondary. */
const PIE_COLORS = [
  "oklch(48% 0.14 12)",
  "oklch(46% 0.08 155)",
  "oklch(52% 0.09 65)",
  "oklch(42% 0.04 230)",
  "oklch(50% 0.05 40)",
  "oklch(38% 0.06 12)",
] as const;

type FinanceRevenuePieProps = {
  slices: FinanceRevenueSlice[];
  currency: PropertyCurrency;
  total: number;
};

export function FinanceRevenuePie({
  slices,
  currency,
  total,
}: FinanceRevenuePieProps) {
  const withMoney = slices.filter((slice) => slice.amount > 0);
  const gradient =
    total > 0 && withMoney.length > 0
      ? buildConicGradient(withMoney, total)
      : "var(--color-surface-strong)";

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__chart-title">
        Sold by room type
      </figcaption>
      <div
        className="staff-sold__pie"
        role="img"
        aria-label={
          withMoney.length === 0
            ? "No money sold in this range"
            : `Revenue split: ${withMoney
                .map(
                  (slice) =>
                    `${slice.roomName} ${formatMoneySuffix(slice.amount, currency)}`,
                )
                .join("; ")}`
        }
        style={{ background: gradient }}
      />
      {withMoney.length === 0 ? (
        <p className="staff-sold__chart-empty">No money in this range yet.</p>
      ) : (
        <ul className="staff-sold__chart-legend" role="list">
          {withMoney.map((slice, index) => {
            const percent = Math.round((slice.amount / total) * 100);
            return (
              <li key={slice.roomId}>
                <span
                  aria-hidden="true"
                  className="staff-sold__chart-swatch"
                  style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                />
                <span className="staff-sold__chart-legend-copy">
                  <strong>{slice.roomName}</strong>
                  <span>
                    {formatMoneySuffix(slice.amount, currency)}
                    <span aria-hidden="true"> · </span>
                    {percent}%
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </figure>
  );
}

function buildConicGradient(slices: FinanceRevenueSlice[], total: number) {
  let cursor = 0;
  const stops: string[] = [];
  for (let index = 0; index < slices.length; index += 1) {
    const slice = slices[index]!;
    const share = (slice.amount / total) * 100;
    const start = cursor;
    const end = cursor + share;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    stops.push(`${color} ${start}% ${end}%`);
    cursor = end;
  }
  return `conic-gradient(from -90deg, ${stops.join(", ")})`;
}
