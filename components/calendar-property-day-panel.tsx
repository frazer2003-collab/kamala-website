import Link from "next/link";

export type PropertyDayStayLink = {
  key: string;
  href: string;
  label: string;
  sublabel: string;
  roomName: string;
};

export type PropertyDayRoomLink = {
  id: string;
  name: string;
  shortName: string;
  stayCount: number;
  href: string;
};

type CalendarPropertyDayPanelProps = {
  date: string;
  monthKey: string;
  bookingCount: number;
  capacity: number;
  stays: PropertyDayStayLink[];
  rooms: PropertyDayRoomLink[];
  boardHref: string;
};

function formatDisplayDate(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

export function CalendarPropertyDayPanel({
  date,
  monthKey,
  bookingCount,
  capacity,
  stays,
  rooms,
  boardHref,
}: CalendarPropertyDayPanelProps) {
  const countLabel =
    bookingCount === 0
      ? "No bookings"
      : `${bookingCount} booking${bookingCount === 1 ? "" : "s"}`;

  return (
    <div className="calendar-property-day">
      <p className="calendar-day-panel__intro">
        {formatDisplayDate(date)}
        <span className="calendar-property-day__meta">
          {" "}
          · <strong>{countLabel}</strong>
          {capacity > 0 ? ` of ${capacity} rooms` : null}
        </span>
      </p>

      {stays.length === 0 ? (
        <p className="detail-help">Nothing booked overnight on this date.</p>
      ) : (
        <div className="calendar-day-panel__choices" aria-label="Stays on this date">
          {stays.map((stay) => (
            <Link className="calendar-day-choice" href={stay.href} key={stay.key}>
              <strong>{stay.label}</strong>
              <span>
                {stay.roomName} · {stay.sublabel}
              </span>
            </Link>
          ))}
        </div>
      )}

      <h3 className="calendar-property-day__section-title">Manage by room</h3>
      <div className="calendar-day-panel__choices" aria-label="Room types for this date">
        {rooms.map((room) => (
          <Link className="calendar-day-choice" href={room.href} key={room.id}>
            <strong>
              {room.shortName}
              {room.stayCount > 0 ? ` · ${room.stayCount}` : ""}
            </strong>
            <span>
              {room.name}
              {room.stayCount > 0
                ? " — walk-in, close dates, allotment, or rates"
                : " — walk-in or adjust availability"}
            </span>
          </Link>
        ))}
      </div>

      <div className="calendar-day-panel__choices">
        <Link className="calendar-day-choice" href={boardHref}>
          <strong>Open room board</strong>
          <span>See room-number rows and stay bars for {monthKey}.</span>
        </Link>
      </div>
    </div>
  );
}
