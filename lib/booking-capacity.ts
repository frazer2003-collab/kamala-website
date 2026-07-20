import { createStaffSupabaseClient } from "@/lib/supabase";
import { bookingOccupiesDay } from "@/lib/calendar";
import { bookingReservesRoom } from "@/lib/booking-reservation";
import {
  buildInventoryLookup,
  getRoomDayInventoryForRange,
} from "@/lib/room-day-inventory";
import type { UnavailableStayDay } from "@/lib/stay-overlap";

/** Thrown when capacity queries cannot be trusted (fail closed for guest sales). */
export class CapacityDataError extends Error {
  constructor(message = "Could not verify room availability.") {
    super(message);
    this.name = "CapacityDataError";
  }
}

export function dateRangesOverlap(
  arrivalA: string,
  departureA: string,
  arrivalB: string,
  departureB: string,
) {
  return arrivalA < departureB && arrivalB < departureA;
}

type OverlapOptions = {
  roomId: string;
  arrival: string;
  departure: string;
  excludeBookingId?: string;
  excludeBlockId?: string;
};

type BatchOverlapOptions = {
  excludeBookingId?: string;
  excludeBlockId?: string;
};

export async function countOverlappingReservationsForRooms(
  roomIds: string[],
  arrival: string,
  departure: string,
  options?: BatchOverlapOptions,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>(roomIds.map((roomId) => [roomId, 0]));

  if (roomIds.length === 0) {
    return counts;
  }

  const supabase = createStaffSupabaseClient();
  const [bookingsResult, blocksResult] = await Promise.all([
    supabase
      .from("booking_requests")
      .select(
        "id, room_id, arrival_date, departure_date, status, deposit_paid_at, bank_transfer_claimed_at",
      )
      .in("room_id", roomIds)
      .lt("arrival_date", departure)
      .gt("departure_date", arrival),
    supabase
      .from("room_blocks")
      .select("id, room_id, start_date, end_date, ical_feed_id")
      .in("room_id", roomIds)
      .lt("start_date", departure)
      .gt("end_date", arrival),
  ]);

  if (bookingsResult.error) {
    throw new CapacityDataError(bookingsResult.error.message);
  }
  if (blocksResult.error) {
    throw new CapacityDataError(blocksResult.error.message);
  }

  const blocks = blocksResult.data ?? [];

  for (const booking of bookingsResult.data ?? []) {
    if (options?.excludeBookingId && booking.id === options.excludeBookingId) {
      continue;
    }

    if (!bookingReservesRoom(booking)) {
      continue;
    }

    if (
      dateRangesOverlap(arrival, departure, booking.arrival_date, booking.departure_date)
    ) {
      counts.set(booking.room_id, (counts.get(booking.room_id) ?? 0) + 1);
    }
  }

  for (const block of blocks) {
    if (options?.excludeBlockId && block.id === options.excludeBlockId) {
      continue;
    }

    // Manual closures shut the room; channel blocks count as one booked unit.
    if (!block.ical_feed_id) {
      continue;
    }

    if (dateRangesOverlap(arrival, departure, block.start_date, block.end_date)) {
      counts.set(block.room_id, (counts.get(block.room_id) ?? 0) + 1);
    }
  }

  return counts;
}

export async function countOverlappingReservations({
  roomId,
  arrival,
  departure,
  excludeBookingId,
  excludeBlockId,
}: OverlapOptions) {
  const counts = await countOverlappingReservationsForRooms(
    [roomId],
    arrival,
    departure,
    { excludeBookingId, excludeBlockId },
  );

  return counts.get(roomId) ?? 0;
}

export async function getUnavailableStayDays(
  roomId: string,
  arrival: string,
  departure: string,
  availableCount: number,
  options?: { excludeBookingId?: string; excludeBlockId?: string },
): Promise<UnavailableStayDay[]> {
  const unavailable: UnavailableStayDay[] = [];

  try {
    const supabase = createStaffSupabaseClient();
    const [bookingsResult, blocksResult, inventoryEntries] = await Promise.all([
      supabase
        .from("booking_requests")
        .select(
          "id, room_id, arrival_date, departure_date, status, deposit_paid_at, bank_transfer_claimed_at",
        )
        .eq("room_id", roomId)
        .lt("arrival_date", departure)
        .gt("departure_date", arrival),
      supabase
        .from("room_blocks")
        .select("id, room_id, start_date, end_date, ical_feed_id")
        .eq("room_id", roomId)
        .lt("start_date", departure)
        .gt("end_date", arrival),
      getRoomDayInventoryForRange(roomId, arrival, departure),
    ]);

    if (bookingsResult.error || blocksResult.error) {
      throw new CapacityDataError(
        bookingsResult.error?.message ?? blocksResult.error?.message,
      );
    }

    const bookings = bookingsResult.data ?? [];
    const blocks = blocksResult.data ?? [];
    const inventoryLookup = buildInventoryLookup(inventoryEntries);

    const cursor = new Date(`${arrival}T00:00:00`);
    const end = new Date(`${departure}T00:00:00`);

    while (cursor < end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      let netBooked = 0;
      let closed = false;

      for (const block of blocks) {
        if (options?.excludeBlockId && block.id === options.excludeBlockId) {
          continue;
        }

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

      if (closed) {
        unavailable.push({ iso, reason: "closed" });
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }

      for (const booking of bookings) {
        if (options?.excludeBookingId && booking.id === options.excludeBookingId) {
          continue;
        }

        if (!bookingReservesRoom(booking)) {
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

      const roomsToSell = inventoryLookup.get(`${roomId}:${iso}`) ?? availableCount;

      if (netBooked + 1 > roomsToSell) {
        unavailable.push({ iso, reason: "sold-out" });
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return unavailable;
  } catch {
    // Fail closed: never treat nights as free when availability cannot be trusted.
    const cursor = new Date(`${arrival}T00:00:00`);
    const end = new Date(`${departure}T00:00:00`);

    while (cursor < end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
      unavailable.push({ iso, reason: "sold-out" });
      cursor.setDate(cursor.getDate() + 1);
    }

    return unavailable;
  }
}

export type StayCapacityResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "verify-failed" };

export async function checkStayCapacity(
  roomId: string,
  arrival: string,
  departure: string,
  availableCount: number,
  options?: { excludeBookingId?: string; excludeBlockId?: string },
): Promise<StayCapacityResult> {
  try {
    const supabase = createStaffSupabaseClient();
    const [bookingsResult, blocksResult, inventoryEntries] = await Promise.all([
      supabase
        .from("booking_requests")
        .select(
          "id, room_id, arrival_date, departure_date, status, deposit_paid_at, bank_transfer_claimed_at",
        )
        .eq("room_id", roomId)
        .lt("arrival_date", departure)
        .gt("departure_date", arrival),
      supabase
        .from("room_blocks")
        .select("id, room_id, start_date, end_date, ical_feed_id")
        .eq("room_id", roomId)
        .lt("start_date", departure)
        .gt("end_date", arrival),
      getRoomDayInventoryForRange(roomId, arrival, departure),
    ]);

    if (bookingsResult.error || blocksResult.error) {
      return { ok: false, reason: "verify-failed" };
    }

    const bookings = bookingsResult.data ?? [];
    const blocks = blocksResult.data ?? [];
    const inventoryLookup = buildInventoryLookup(inventoryEntries);

    const cursor = new Date(`${arrival}T00:00:00`);
    const end = new Date(`${departure}T00:00:00`);

    while (cursor < end) {
      const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

      let netBooked = 0;

      for (const block of blocks) {
        if (options?.excludeBlockId && block.id === options.excludeBlockId) {
          continue;
        }

        if (
          !bookingOccupiesDay(
            { arrivalDate: block.start_date, departureDate: block.end_date },
            iso,
          )
        ) {
          continue;
        }

        // OTA/channel imports occupy a single unit; staff closures shut the room.
        if (block.ical_feed_id) {
          netBooked += 1;
        } else {
          return { ok: false, reason: "unavailable" };
        }
      }

      for (const booking of bookings) {
        if (options?.excludeBookingId && booking.id === options.excludeBookingId) {
          continue;
        }

        if (!bookingReservesRoom(booking)) {
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

      const roomsToSell = inventoryLookup.get(`${roomId}:${iso}`) ?? availableCount;

      if (netBooked >= roomsToSell) {
        return { ok: false, reason: "unavailable" };
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "verify-failed" };
  }
}

export async function hasCapacityForStay(
  roomId: string,
  arrival: string,
  departure: string,
  availableCount: number,
  options?: { excludeBookingId?: string; excludeBlockId?: string },
) {
  const result = await checkStayCapacity(
    roomId,
    arrival,
    departure,
    availableCount,
    options,
  );
  return result.ok;
}
