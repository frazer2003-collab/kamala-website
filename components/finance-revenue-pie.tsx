export type FinanceSoldRoom = {
  roomId: string;
  roomName: string;
  nightsSold: number;
  nightsAvailable: number;
};

/** Calm hospitality — sold fills maroon; unsold stays quiet. */
const COLOR_SOLD = "oklch(48% 0.14 12)";
const COLOR_UNSOLD = "oklch(90% 0.01 12)";

type FinanceSoldPieProps = {
  nightsSold: number;
  nightsAvailable: number;
  rooms: FinanceSoldRoom[];
};

export function FinanceSoldPie({
  nightsSold,
  nightsAvailable,
  rooms,
}: FinanceSoldPieProps) {
  const house = occupancyParts(nightsSold, nightsAvailable);
  const roomRows = rooms.filter((room) => room.nightsAvailable > 0);

  return (
    <figure className="staff-sold__chart" aria-labelledby="finance-pie-title">
      <figcaption id="finance-pie-title" className="staff-sold__chart-title">
        Sold of available
      </figcaption>

      <div className="staff-sold__pie-block">
        <p className="staff-sold__pie-label">All rooms</p>
        <div
          className="staff-sold__pie"
          role="img"
          aria-label={pieAriaLabel("All rooms", house)}
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
          </ul>
        )}
      </div>

      {roomRows.length > 0 ? (
        <div className="staff-sold__room-pies">
          <h3 className="staff-sold__room-pies-title" id="finance-room-pies-title">
            By room type
          </h3>
          <ul
            className="staff-sold__room-pie-list"
            role="list"
            aria-labelledby="finance-room-pies-title"
          >
            {roomRows.map((room) => {
              const parts = occupancyParts(room.nightsSold, room.nightsAvailable);
              return (
                <li key={room.roomId}>
                  <div
                    className="staff-sold__pie staff-sold__pie--room"
                    role="img"
                    aria-label={pieAriaLabel(room.roomName, parts)}
                    style={{ background: pieGradient(parts) }}
                  />
                  <span className="staff-sold__room-pie-copy">
                    <strong>{room.roomName}</strong>
                    <span>
                      {parts.soldPercent === null ? (
                        "No capacity"
                      ) : (
                        <>
                          {parts.soldPercent}% sold
                          <span aria-hidden="true"> · </span>
                          {parts.sold} of {parts.capacity} nights
                        </>
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
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

function pieAriaLabel(label: string, parts: OccupancyParts) {
  if (parts.capacity <= 0) {
    return `${label}: no door-nights available in this range`;
  }
  return `${label}: sold ${parts.sold} of ${parts.capacity} door-nights${
    parts.soldPercent === null ? "" : ` (${parts.soldPercent}%)`
  }`;
}

function nightWord(count: number) {
  return `${count} ${count === 1 ? "night" : "nights"}`;
}
