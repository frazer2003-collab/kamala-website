import Link from "next/link";
import type { Room } from "@/lib/content";
import type { StaffBooking } from "@/lib/booking-requests";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import { isChannelReservation } from "@/lib/room-blocks";
import type { CalendarDay } from "@/lib/calendar";
import { buildStaffCalendarHref, getTodayIso, isPastCalendarDate } from "@/lib/calendar";
import { getDaySaleStatus, getDaySaleStatusLabel } from "@/lib/calendar-timeline";
import { getRoomsToSellForDay } from "@/lib/room-day-inventory";

type StaffCalendarSellPanelProps = {
  rooms: Room[];
  bookings: StaffBooking[];
  blocks: StaffRoomBlock[];
  calendarDays: CalendarDay[];
  inventoryLookup: Map<string, number>;
  monthKey: string;
  fromIso: string;
  toIso: string;
};

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

export function StaffCalendarSellPanel({
  rooms,
  bookings,
  blocks,
  calendarDays,
  inventoryLookup,
  monthKey,
  fromIso,
  toIso,
}: StaffCalendarSellPanelProps) {
  const today = getTodayIso();
  const upcoming = calendarDays.filter(
    (day) => day.iso >= today && !isPastCalendarDate(day.iso),
  ).slice(0, 14);

  return (
    <section
      aria-labelledby="calendar-sell-title"
      className="staff-calendar-role-panel staff-calendar-role-panel--sell"
    >
      <div className="staff-calendar-role-panel__header">
        <h2 id="calendar-sell-title">Nights to sell</h2>
        <p>Next two weeks — open nights you can still take a booking for.</p>
      </div>

      {rooms.length === 0 ? (
        <p className="staff-calendar-role-panel__empty" role="status">
          No room types are set up yet, so there are no nights to sell.
        </p>
      ) : (
        <div className="staff-calendar-sell-grid">
          {rooms.map((room) => {
            const manualClosures = blocks.filter(
              (block) => block.roomId === room.id && !isChannelReservation(block),
            );
            const roomBookings = bookings.filter((booking) => booking.roomId === room.id);
            const channelBooked = blocks.filter(
              (block) => block.roomId === room.id && isChannelReservation(block),
            );

            const openNights = upcoming.filter((day) => {
              const capacity = getRoomsToSellForDay(room, day.iso, inventoryLookup);
              const direct = roomBookings.filter(
                (booking) =>
                  booking.arrivalDate <= day.iso && booking.departureDate > day.iso,
              ).length;
              const channel = channelBooked.filter(
                (block) => block.startDate <= day.iso && block.endDate > day.iso,
              ).length;
              const status = getDaySaleStatus(
                room.id,
                day.iso,
                manualClosures,
                capacity,
                direct + channel,
              );
              return status === "bookable";
            });

            return (
              <article className="staff-calendar-sell-card" key={room.id}>
                <header className="staff-calendar-sell-card__header">
                  <h3>{room.shortName}</h3>
                  <p>
                    <strong>{openNights.length}</strong> open night
                    {openNights.length === 1 ? "" : "s"}
                  </p>
                </header>
                {openNights.length === 0 ? (
                  <p className="staff-calendar-sell-card__empty">No open nights in this window.</p>
                ) : (
                  <ul className="staff-calendar-sell-card__days">
                    {openNights.slice(0, 8).map((day) => {
                      const href = buildStaffCalendarHref({
                        month: monthKey,
                        from: fromIso,
                        to: toIso,
                        room: room.id,
                        date: day.iso,
                        mode: "walk-in",
                      });
                      return (
                        <li key={day.iso}>
                          <Link className="staff-calendar-sell-card__day" href={href}>
                            <span>{formatDay(day.iso)}</span>
                            <span>{getDaySaleStatusLabel("bookable")}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {openNights.length > 8 ? (
                  <p className="staff-calendar-sell-card__more">
                    +{openNights.length - 8} more open nights on Desk view
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
