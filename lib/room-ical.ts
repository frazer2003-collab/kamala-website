import { bookingOccupiesDay } from "@/lib/calendar";
import { bookingBlocksCalendarExport } from "@/lib/booking-reservation";
import { buildIcsCalendar, type IcalEvent } from "@/lib/ical";
import {
  addIsoDays,
  buildInventoryLookup,
  getRoomDayInventoryForRange,
} from "@/lib/room-day-inventory";
import { getRoomForBooking } from "@/lib/rooms";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

const ICAL_EXPORT_HORIZON_DAYS = 540;

function todayIsoLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getRoomByIcalExportToken(token: string) {
  if (!token || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, short_name, ical_export_token")
      .eq("ical_export_token", token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function getRoomUnitByIcalExportToken(token: string) {
  if (!token || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("room_units")
      .select("id, number, ical_export_token")
      .eq("ical_export_token", token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/** Merge sorted night ISOs into DTEND-exclusive busy events. */
export function mergeBusyNightsToEvents(
  nights: string[],
  uidPrefix: string,
  summary: string,
): IcalEvent[] {
  if (nights.length === 0) {
    return [];
  }

  const sorted = [...new Set(nights)].sort();
  const events: IcalEvent[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const night = sorted[index];
    if (night === addIsoDays(rangeEnd, 1)) {
      rangeEnd = night;
      continue;
    }

    events.push({
      uid: `${uidPrefix}-${rangeStart}`,
      summary,
      startDate: rangeStart,
      endDate: addIsoDays(rangeEnd, 1),
    });
    rangeStart = night;
    rangeEnd = night;
  }

  events.push({
    uid: `${uidPrefix}-${rangeStart}`,
    summary,
    startDate: rangeStart,
    endDate: addIsoDays(rangeEnd, 1),
  });

  return events;
}

async function getTypeSoldOutNights(
  roomId: string,
  availableCount: number,
  rangeStart: string,
  rangeEndExclusive: string,
): Promise<Set<string>> {
  const supabase = createStaffSupabaseClient();
  const [{ data: bookings }, blocksResult, inventoryEntries] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, arrival_date, departure_date, status")
      .eq("room_id", roomId)
      .lt("arrival_date", rangeEndExclusive)
      .gt("departure_date", rangeStart),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, ical_feed_id")
      .eq("room_id", roomId)
      .lt("start_date", rangeEndExclusive)
      .gt("end_date", rangeStart),
    getRoomDayInventoryForRange(roomId, rangeStart, rangeEndExclusive),
  ]);

  const blocks = blocksResult.error ? [] : (blocksResult.data ?? []);
  const inventoryLookup = buildInventoryLookup(inventoryEntries);
  const soldOut = new Set<string>();
  const cursor = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEndExclusive}T00:00:00`);

  while (cursor < end) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    let netBooked = 0;
    let closed = false;

    for (const block of blocks) {
      if (
        !bookingOccupiesDay(
          { arrivalDate: block.start_date, departureDate: block.end_date },
          iso,
        )
      ) {
        continue;
      }

      if (!block.ical_feed_id) {
        closed = true;
        break;
      }

      netBooked += 1;
    }

    if (!closed) {
      for (const booking of bookings ?? []) {
        if (!bookingBlocksCalendarExport(booking)) {
          continue;
        }

        if (
          bookingOccupiesDay(
            {
              arrivalDate: booking.arrival_date,
              departureDate: booking.departure_date,
            },
            iso,
          )
        ) {
          netBooked += 1;
        }
      }
    }

    const roomsToSell = inventoryLookup.get(`${roomId}:${iso}`) ?? availableCount;
    if (closed || netBooked >= roomsToSell) {
      soldOut.add(iso);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return soldOut;
}

/**
 * Room-type export: open website stays on the type + type-level manual closures.
 * Does not re-export channel/Airbnb imports (loop avoidance).
 */
export async function getRoomIcalExportEvents(roomId: string): Promise<IcalEvent[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, guest_name, arrival_date, departure_date, status")
      .eq("room_id", roomId)
      .neq("status", "declined")
      .order("arrival_date", { ascending: true }),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, reason, ical_feed_id")
      .eq("room_id", roomId)
      .is("ical_feed_id", null)
      .order("start_date", { ascending: true }),
  ]);

  const events: IcalEvent[] = [];

  for (const booking of bookings ?? []) {
    if (!bookingBlocksCalendarExport(booking)) {
      continue;
    }

    events.push({
      uid: `kamala-booking-${booking.id}`,
      summary: "Reserved",
      startDate: booking.arrival_date,
      endDate: booking.departure_date,
    });
  }

  for (const block of blocks ?? []) {
    events.push({
      uid: `kamala-block-${block.id}`,
      summary: "Closed",
      startDate: block.start_date,
      endDate: block.end_date,
    });
  }

  return events;
}

/**
 * Per room-number Airbnb export:
 * - open website stays assigned to this door
 * - manual closes on this door
 * - nights when the linked room type is sold out (allotment reached)
 * OTA imports are not re-exported (avoids loops).
 */
export async function getRoomUnitIcalExportEvents(unitId: string): Promise<IcalEvent[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const [{ data: unitTypeRows }, { data: bookings }, { data: blocks }] = await Promise.all([
    supabase.from("room_unit_types").select("room_id").eq("room_unit_id", unitId),
    supabase
      .from("booking_requests")
      .select("id, guest_name, arrival_date, departure_date, status")
      .eq("room_unit_id", unitId)
      .neq("status", "declined")
      .order("arrival_date", { ascending: true }),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, reason")
      .eq("room_unit_id", unitId)
      .is("ical_feed_id", null)
      .order("start_date", { ascending: true }),
  ]);

  const events: IcalEvent[] = [];
  const coveredNights = new Set<string>();

  for (const booking of bookings ?? []) {
    if (!bookingBlocksCalendarExport(booking)) {
      continue;
    }

    events.push({
      uid: `kamala-booking-${booking.id}`,
      summary: "Reserved",
      startDate: booking.arrival_date,
      endDate: booking.departure_date,
    });

    let cursor = booking.arrival_date;
    while (cursor < booking.departure_date) {
      coveredNights.add(cursor);
      cursor = addIsoDays(cursor, 1);
    }
  }

  for (const block of blocks ?? []) {
    events.push({
      uid: `kamala-block-${block.id}`,
      summary: "Closed",
      startDate: block.start_date,
      endDate: block.end_date,
    });

    let cursor = block.start_date;
    while (cursor < block.end_date) {
      coveredNights.add(cursor);
      cursor = addIsoDays(cursor, 1);
    }
  }

  const rangeStart = todayIsoLocal();
  const rangeEndExclusive = addIsoDays(rangeStart, ICAL_EXPORT_HORIZON_DAYS);
  const soldOutNights = new Set<string>();

  for (const row of unitTypeRows ?? []) {
    const room = await getRoomForBooking(row.room_id);
    if (!room) {
      continue;
    }

    const nights = await getTypeSoldOutNights(
      row.room_id,
      room.availableCount,
      rangeStart,
      rangeEndExclusive,
    );
    for (const night of nights) {
      soldOutNights.add(night);
    }
  }

  const extraSoldOut = [...soldOutNights].filter((night) => !coveredNights.has(night));
  events.push(
    ...mergeBusyNightsToEvents(extraSoldOut, `kamala-soldout-${unitId}`, "Unavailable"),
  );

  return events;
}

export async function buildRoomIcalExport(roomId: string, calendarName: string) {
  const events = await getRoomIcalExportEvents(roomId);
  return buildIcsCalendar(events, calendarName);
}

export async function buildRoomUnitIcalExport(unitId: string, calendarName: string) {
  const events = await getRoomUnitIcalExportEvents(unitId);
  return buildIcsCalendar(events, calendarName);
}
