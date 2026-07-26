/**
 * THESIS: Door tape is the desk — assign and move stays by door, not by inventory matrix.
 * OWN-WORLD: Trusted Counter — maroon sparingly, humanist sans, quiet hospitality ops density.
 * STORY: Staff see doors, find who needs a room #, drag or Move to # onto a free door, walk-in when needed.
 * FIRST VIEWPORT: Attention → collapsed dates → need-room tape → door rows.
 * FORM: Tape Chart Desk (shape B); extend existing surface — no new visual world.
 */
"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CalendarDateStrip } from "@/components/calendar-date-strip";
import { StaffCalendarAttention } from "@/components/staff-calendar-attention";
import { StaffTimelineCalendar } from "@/components/staff-lazy";
import type { StaffBooking } from "@/lib/booking-requests";
import type { CalendarDay } from "@/lib/calendar";
import type { CalendarColors } from "@/lib/calendar-colors";
import type { Room } from "@/lib/content";
import type { PropertyCurrency } from "@/lib/currency";
import type { RoomPromotionRate } from "@/lib/pricing";
import type { StaffRoomBlock } from "@/lib/room-blocks";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";
import {
  countStaysMatchingQuery,
  normalizeStaffCalendarQuery,
} from "@/lib/staff-calendar-search";

type StaffCalendarDeskProps = {
  arrivingCount: number;
  unassignedCount: number;
  firstNeedRoomId?: string;
  monthKey: string;
  fromIso: string;
  toIso: string;
  selectedBlockKey?: string;
  selectedBookingKey?: string;
  blocks: StaffRoomBlock[];
  bookings: StaffBooking[];
  calendarColors: CalendarColors;
  calendarDays: CalendarDay[];
  canManage: boolean;
  currency: PropertyCurrency;
  inventoryLookup: Map<string, number>;
  rateLookup: Map<string, number>;
  monthLabel: string;
  occupancies: UnitOccupancy[];
  promotions: RoomPromotionRate[];
  roomUnits: RoomUnit[];
  rooms: Room[];
  selectedDate?: string;
  selectedRoomId?: string;
};

export function StaffCalendarDesk({
  arrivingCount,
  unassignedCount,
  firstNeedRoomId,
  monthKey,
  fromIso,
  toIso,
  selectedBlockKey,
  selectedBookingKey,
  blocks,
  bookings,
  calendarColors,
  calendarDays,
  canManage,
  currency,
  inventoryLookup,
  rateLookup,
  monthLabel,
  occupancies,
  promotions,
  roomUnits,
  rooms,
  selectedDate,
  selectedRoomId,
}: StaffCalendarDeskProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalized = normalizeStaffCalendarQuery(deferredQuery);
  const matchCount = useMemo(
    () => countStaysMatchingQuery(deferredQuery, bookings, blocks),
    [deferredQuery, bookings, blocks],
  );

  return (
    <div className="staff-calendar-desk">
      <StaffCalendarAttention
        arrivingCount={arrivingCount}
        firstNeedRoomId={firstNeedRoomId}
        fromIso={fromIso}
        matchCount={normalized ? matchCount : null}
        monthKey={monthKey}
        onQueryChange={setQuery}
        query={query}
        toIso={toIso}
        unassignedCount={unassignedCount}
      />

      <details className="calendar-date-strip-details">
        <summary>Date range</summary>
        <CalendarDateStrip
          fromIso={fromIso}
          selectedBlockKey={selectedBlockKey}
          selectedBookingKey={selectedBookingKey}
          toIso={toIso}
        />
      </details>

      <div
        className={[
          "staff-calendar-tape",
          normalized ? "staff-calendar-tape--searching" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        id="need-room"
      >
        <StaffTimelineCalendar
          blocks={blocks}
          bookings={bookings}
          calendarColors={calendarColors}
          calendarDays={calendarDays}
          canManage={canManage}
          currency={currency}
          fromIso={fromIso}
          inventoryLookup={inventoryLookup}
          monthKey={monthKey}
          monthLabel={monthLabel}
          occupancies={occupancies}
          promotions={promotions}
          rateLookup={rateLookup}
          roomUnits={roomUnits}
          rooms={rooms}
          searchQuery={deferredQuery}
          selectedBlockKey={selectedBlockKey ?? ""}
          selectedBookingKey={selectedBookingKey ?? ""}
          selectedDate={selectedDate}
          selectedRoomId={selectedRoomId}
          toIso={toIso}
        />
      </div>
    </div>
  );
}
