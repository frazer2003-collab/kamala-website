import Link from "next/link";
import type { StaffBooking } from "@/lib/booking-requests";
import { getStaffBookingKey } from "@/lib/booking-requests";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import { getStaffRoomBlockKey, isChannelReservation } from "@/lib/room-blocks";
import type { Room } from "@/lib/content";
import { buildStaffCalendarHref, getTodayIso } from "@/lib/calendar";

type PrepareRow = {
  key: string;
  href: string;
  guest: string;
  roomLabel: string;
  door: string;
  arrival: string;
  nightsHint: string;
};

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function addIsoDays(iso: string, days: number) {
  const next = new Date(`${iso}T00:00:00`);
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
}

type StaffCalendarPreparePanelProps = {
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  rooms: Room[];
  monthKey: string;
  fromIso: string;
  toIso: string;
};

export function StaffCalendarPreparePanel({
  bookings,
  blocks,
  rooms,
  monthKey,
  fromIso,
  toIso,
}: StaffCalendarPreparePanelProps) {
  const today = getTodayIso();
  const horizon = addIsoDays(today, 3);
  const roomName = new Map(rooms.map((room) => [room.id, room.shortName]));

  const rows: PrepareRow[] = [];

  for (const booking of bookings) {
    if (booking.arrivalDate < today || booking.arrivalDate > horizon) {
      continue;
    }
    rows.push({
      key: getStaffBookingKey(booking),
      href: buildStaffCalendarHref({
        month: monthKey,
        from: fromIso,
        to: toIso,
        booking: getStaffBookingKey(booking),
      }),
      guest: booking.guest,
      roomLabel: roomName.get(booking.roomId) ?? booking.roomName,
      door: booking.roomNumber ? `Room ${booking.roomNumber}` : "No room # yet",
      arrival: booking.arrivalDate,
      nightsHint: `${formatDay(booking.arrivalDate)} → ${formatDay(booking.departureDate)}`,
    });
  }

  for (const block of blocks) {
    if (!isChannelReservation(block)) {
      continue;
    }
    if (block.startDate < today || block.startDate > horizon) {
      continue;
    }
    rows.push({
      key: getStaffRoomBlockKey(block),
      href: buildStaffCalendarHref({
        month: monthKey,
        from: fromIso,
        to: toIso,
        block: getStaffRoomBlockKey(block),
      }),
      guest: block.guestName.trim() || block.channelLabel || "Channel guest",
      roomLabel: roomName.get(block.roomId) ?? block.roomId,
      door: block.roomNumber ? `Room ${block.roomNumber}` : "No room # yet",
      arrival: block.startDate,
      nightsHint: `${formatDay(block.startDate)} → ${formatDay(block.endDate)}`,
    });
  }

  rows.sort((left, right) => left.arrival.localeCompare(right.arrival) || left.guest.localeCompare(right.guest));

  return (
    <section
      aria-labelledby="calendar-prepare-title"
      className="staff-calendar-role-panel staff-calendar-role-panel--prepare"
    >
      <div className="staff-calendar-role-panel__header">
        <h2 id="calendar-prepare-title">Prepare rooms</h2>
        <p>
          Arrivals through {formatDay(horizon)}. Clean the door before the guest checks in.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="staff-calendar-role-panel__empty" role="status">
          No arrivals in the next three days.
        </p>
      ) : (
        <ul className="staff-calendar-role-panel__list">
          {rows.map((row) => (
            <li key={row.key}>
              <Link className="staff-calendar-role-panel__row" href={row.href}>
                <span className="staff-calendar-role-panel__door">{row.door}</span>
                <span className="staff-calendar-role-panel__meta">
                  <strong>{row.guest}</strong>
                  <span>
                    {row.roomLabel} · {row.nightsHint}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
