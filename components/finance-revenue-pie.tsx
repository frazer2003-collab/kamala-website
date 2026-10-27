import {
  buildFinanceSoldPieAriaLabel,
  buildFinanceSoldPieGradient,
  buildFinanceSoldPieModel,
} from "@/lib/finance-sold-pie";

type FinanceSoldPieProps = {
  nightsSold: number;
  nightsAvailable: number;
  nightsOverCapacity?: number;
  nightsStillOpen?: number;
  nightsPassedUnsold?: number;
};

export function FinanceSoldPie({
  nightsSold,
  nightsAvailable,
  nightsOverCapacity = 0,
  nightsStillOpen,
  nightsPassedUnsold = 0,
}: FinanceSoldPieProps) {
  const model = buildFinanceSoldPieModel(
    nightsSold,
    nightsAvailable,
    nightsOverCapacity,
    nightsStillOpen,
    nightsPassedUnsold,
  );

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__section-title">
        Occupancy
      </figcaption>
      {model.capacity <= 0 ? (
        <p className="staff-sold__chart-empty">
          No door-nights to sell in this range.
        </p>
      ) : (
        <>
          <div className="staff-sold__pie-wrap">
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
            <p className="staff-sold__pie-center" aria-hidden="true">
              <strong>{model.soldPercent ?? 0}%</strong>
              <span>sold</span>
            </p>
          </div>
          <ul className="staff-sold__chart-legend">
            <li>
              <span
                aria-hidden="true"
                className="staff-sold__chart-swatch staff-sold__chart-swatch--sold"
              />
              <span className="staff-sold__chart-legend-copy">
                <strong>Sold</strong>
                <span>{nightWord(model.nightsSold)}</span>
              </span>
            </li>
            <li>
              <span
                aria-hidden="true"
                className="staff-sold__chart-swatch staff-sold__chart-swatch--unsold"
              />
              <span className="staff-sold__chart-legend-copy">
                <strong>Still open</strong>
                <span>{nightWord(model.nightsStillOpen)}</span>
              </span>
            </li>
            {model.nightsPassedUnsold > 0 ? (
              <li>
                <span
                  aria-hidden="true"
                  className="staff-sold__chart-swatch staff-sold__chart-swatch--passed"
                />
                <span className="staff-sold__chart-legend-copy">
                  <strong>Unsold, already passed</strong>
                  <span>{nightWord(model.nightsPassedUnsold)}</span>
                </span>
              </li>
            ) : null}
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
        </>
      )}
    </figure>
  );
}

function nightWord(count: number) {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}
