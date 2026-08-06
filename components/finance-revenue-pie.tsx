/** Calm hospitality swatches — labels carry identity; color is secondary. */
const COLOR_SOLD = "oklch(48% 0.14 12)";
const COLOR_UNSOLD = "oklch(90% 0.01 12)";

type FinanceSoldPieProps = {
  nightsSold: number;
  nightsAvailable: number;
};

export function FinanceSoldPie({
  nightsSold,
  nightsAvailable,
}: FinanceSoldPieProps) {
  const capacity = Math.max(0, nightsAvailable);
  const sold = Math.min(Math.max(0, nightsSold), capacity);
  const unsold = Math.max(0, capacity - sold);
  const soldPercent = capacity > 0 ? Math.round((sold / capacity) * 100) : null;
  const unsoldPercent =
    capacity > 0 ? Math.max(0, 100 - (soldPercent ?? 0)) : null;
  const soldShare = capacity > 0 ? (sold / capacity) * 100 : 0;

  const gradient =
    capacity <= 0
      ? "var(--color-surface-strong)"
      : sold <= 0
        ? COLOR_UNSOLD
        : unsold <= 0
          ? COLOR_SOLD
          : `conic-gradient(from -90deg, ${COLOR_SOLD} 0% ${soldShare}%, ${COLOR_UNSOLD} ${soldShare}% 100%)`;

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__chart-title">
        Sold of available
      </figcaption>
      <div
        className="staff-sold__pie"
        role="img"
        aria-label={
          capacity <= 0
            ? "No door-nights available in this range"
            : `Sold ${sold} of ${capacity} door-nights${
                soldPercent === null ? "" : ` (${soldPercent}%)`
              }`
        }
        style={{ background: gradient }}
      />
      {capacity <= 0 ? (
        <p className="staff-sold__chart-empty">
          No door-nights to sell in this range.
        </p>
      ) : (
        <ul className="staff-sold__chart-legend" role="list">
          <li>
            <span
              aria-hidden="true"
              className="staff-sold__chart-swatch"
              style={{ background: COLOR_SOLD }}
            />
            <span className="staff-sold__chart-legend-copy">
              <strong>Sold</strong>
              <span>
                {nightWord(sold)}
                <span aria-hidden="true"> · </span>
                {soldPercent}%
              </span>
            </span>
          </li>
          <li>
            <span
              aria-hidden="true"
              className="staff-sold__chart-swatch"
              style={{ background: COLOR_UNSOLD }}
            />
            <span className="staff-sold__chart-legend-copy">
              <strong>Still available</strong>
              <span>
                {nightWord(unsold)}
                <span aria-hidden="true"> · </span>
                {unsoldPercent}%
              </span>
            </span>
          </li>
        </ul>
      )}
    </figure>
  );
}

function nightWord(count: number) {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}
