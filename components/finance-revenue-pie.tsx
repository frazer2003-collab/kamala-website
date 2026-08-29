import {
  buildFinanceSoldPieAriaLabel,
  buildFinanceSoldPieGradient,
  buildFinanceSoldPieModel,
} from "@/lib/finance-sold-pie";

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
  const model = buildFinanceSoldPieModel(
    nightsSold,
    nightsAvailable,
    nightsOverCapacity,
  );

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__chart-title">
        Sold of available
      </figcaption>
      <div
        className={[
          "staff-sold__pie",
          model.isOverCapacity ? "staff-sold__pie--over-capacity" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="img"
        aria-label={buildFinanceSoldPieAriaLabel(model)}
        style={{
          background: buildFinanceSoldPieGradient(
            model,
            "var(--finance-pie-sold, var(--color-maroon))",
            "var(--finance-pie-unsold, var(--color-surface-strong))",
          ),
        }}
      />
      {model.capacity <= 0 ? (
        <p className="staff-sold__chart-empty">
          No door-nights to sell in this range.
        </p>
      ) : (
        <ul className="staff-sold__chart-legend" role="list">
          <li>
            <span
              aria-hidden="true"
              className="staff-sold__chart-swatch staff-sold__chart-swatch--sold"
            />
            <span className="staff-sold__chart-legend-copy">
              <strong>Sold</strong>
              <span>
                {nightWord(model.nightsSold)}
                <span aria-hidden="true"> · </span>
                {model.soldPercent}%
              </span>
            </span>
          </li>
          <li>
            <span
              aria-hidden="true"
              className="staff-sold__chart-swatch staff-sold__chart-swatch--unsold"
            />
            <span className="staff-sold__chart-legend-copy">
              <strong>Still available</strong>
              <span>
                {nightWord(model.nightsUnsold)}
                <span aria-hidden="true"> · </span>
                {model.unsoldPercent}%
              </span>
            </span>
          </li>
          {model.isOverCapacity ? (
            <li>
              <span
                aria-hidden="true"
                className="staff-sold__chart-swatch staff-sold__chart-swatch--over"
              />
              <span className="staff-sold__chart-legend-copy">
                <strong>Over capacity</strong>
                <span>{nightWord(model.nightsOverCapacity)}</span>
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </figure>
  );
}

function nightWord(count: number) {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}
