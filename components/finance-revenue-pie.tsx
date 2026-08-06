/** Calm hospitality — sold fills maroon; unsold stays quiet. */
const COLOR_SOLD = "oklch(48% 0.14 12)";
const COLOR_UNSOLD = "oklch(90% 0.01 12)";

type FinanceSoldPieProps = {
  nightsSold: number;
  nightsAvailable: number;
  nightsOverCapacity?: number;
};

export function FinanceSoldPie({
  nightsSold,
  nightsAvailable,
  nightsOverCapacity = 0,
}: FinanceSoldPieProps) {
  const house = occupancyParts(nightsSold, nightsAvailable);
  const over = Math.max(0, nightsOverCapacity);

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__chart-title">
        Sold of available
      </figcaption>
      <div
        className="staff-sold__pie"
        role="img"
        aria-label={pieAriaLabel(house, over)}
        style={{ background: pieGradient(house) }}
      />
      {house.capacity <= 0 ? (
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
                {nightWord(house.sold)}
                <span aria-hidden="true"> · </span>
                {house.soldPercent}%
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
                {nightWord(house.unsold)}
                <span aria-hidden="true"> · </span>
                {house.unsoldPercent}%
              </span>
            </span>
          </li>
          {over > 0 ? (
            <li>
              <span
                aria-hidden="true"
                className="staff-sold__chart-swatch staff-sold__chart-swatch--quiet"
              />
              <span className="staff-sold__chart-legend-copy">
                <strong>Over capacity</strong>
                <span>{nightWord(over)}</span>
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </figure>
  );
}

type OccupancyParts = {
  capacity: number;
  sold: number;
  unsold: number;
  soldPercent: number | null;
  unsoldPercent: number | null;
  soldShare: number;
};

function occupancyParts(nightsSold: number, nightsAvailable: number): OccupancyParts {
  const capacity = Math.max(0, nightsAvailable);
  const sold = Math.min(Math.max(0, nightsSold), capacity);
  const unsold = Math.max(0, capacity - sold);
  const soldPercent = capacity > 0 ? Math.round((sold / capacity) * 100) : null;
  const unsoldPercent =
    capacity > 0 ? Math.max(0, 100 - (soldPercent ?? 0)) : null;
  const soldShare = capacity > 0 ? (sold / capacity) * 100 : 0;
  return { capacity, sold, unsold, soldPercent, unsoldPercent, soldShare };
}

function pieGradient(parts: OccupancyParts) {
  if (parts.capacity <= 0) {
    return "var(--color-surface-strong)";
  }
  if (parts.sold <= 0) {
    return COLOR_UNSOLD;
  }
  if (parts.unsold <= 0) {
    return COLOR_SOLD;
  }
  return `conic-gradient(from -90deg, ${COLOR_SOLD} 0% ${parts.soldShare}%, ${COLOR_UNSOLD} ${parts.soldShare}% 100%)`;
}

function pieAriaLabel(parts: OccupancyParts, over: number) {
  if (parts.capacity <= 0) {
    return "No door-nights available in this range";
  }
  const base = `Sold ${parts.sold} of ${parts.capacity} door-nights${
    parts.soldPercent === null ? "" : ` (${parts.soldPercent}%)`
  }`;
  if (over <= 0) {
    return base;
  }
  return `${base}; ${over} night${over === 1 ? "" : "s"} over capacity`;
}

function nightWord(count: number) {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}
