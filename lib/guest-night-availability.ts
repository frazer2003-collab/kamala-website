import type { Room } from "@/lib/content";
import { bookingReservesRoom } from "@/lib/booking-reservation";
import { isChannelBlockRow } from "@/lib/booking-source";
import { computeGuestNightAvailability } from "@/lib/guest-night-availability-core";
import {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  type GuestNightStatus,
} from "@/lib/guest-night-availability-shared";
import {
  addIsoDays,
  buildInventoryLookup,
  eachIsoDayInclusive,
  loadRoomDayInventoryForRoomsRange,
} from "@/lib/room-day-inventory";
import { getStaffRoomUnits } from "@/lib/room-units";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

export type { GuestNightStatus };
export {
  computeGuestNightAvailability,
} from "@/lib/guest-night-availability-core";
export {
  GUEST_NIGHT_AVAILABILITY_MAX_DAYS,
  clampGuestNightAvailabilityQuery,
  countInclusiveIsoDays,
  findNextOpenArrivalIso,
  guestNightAvailabilityLatestIso,
  shiftStayDatesIfArrivalFull,
} from "@/lib/guest-night-availability-shared";


export type GuestNightAvailabilityResult = {
  status: "ok" | "verify-failed";
  nights: Record<string, GuestNightStatus>;
};

export async function getGuestNightAvailability(
  rooms: Room[],
  fromIso: string,
  toIso: string,
): Promise<GuestNightAvailabilityResult> {
  if (rooms.length === 0 || toIso < fromIso) {
    return { status: "ok", nights: {} };
  }

  if (!hasStaffSupabaseConfig()) {
    const nights: Record<string, GuestNightStatus> = {};
    for (const iso of eachIsoDayInclusive(fromIso, toIso)) {
      nights[iso] = "open";
    }
    return { status: "ok", nights };
  }

  const queryDeparture = addIsoDays(toIso, 1);
  const supabase = createStaffSupabaseClient();

  try {
    const [bookingsResult, inventoryResult, blocksResult, unitsResult] =
      await Promise.all([
        supabase
          .from("booking_requests")
          .select(
            "id, room_id, room_unit_id, arrival_date, departure_date, status, deposit_paid_at, bank_transfer_claimed_at, guest_name",
          )
          .lt("arrival_date", queryDeparture)
          .gt("departure_date", fromIso),
        loadRoomDayInventoryForRoomsRange(
          rooms.map((room) => room.id),
          fromIso,
          queryDeparture,
        ),
        supabase
          .from("room_blocks")
          .select(
            "id, room_id, room_unit_id, start_date, end_date, staff_booking_source, guest_name, reason",
          )
          .lt("start_date", queryDeparture)
          .gt("end_date", fromIso),
        getStaffRoomUnits(),
      ]);

    if (bookingsResult.error || blocksResult.error || !inventoryResult.ok) {
      return { status: "verify-failed", nights: {} };
    }

    const units = unitsResult.units;
    const bookings = (bookingsResult.data ?? [])
      .filter((booking) => bookingReservesRoom(booking))
      .map((booking) => ({
        roomId: booking.room_id,
        roomUnitId: booking.room_unit_id,
        arrivalDate: booking.arrival_date,
        departureDate: booking.departure_date,
        databaseId: booking.id,
        guest: booking.guest_name ?? "Guest",
      }));

    const allBlocks = blocksResult.data ?? [];
    const channelBlocks = allBlocks
      .filter((block) => isChannelBlockRow(block))
      .map((block) => ({
        roomId: block.room_id,
        roomUnitId: block.room_unit_id,
        startDate: block.start_date,
        endDate: block.end_date,
        databaseId: block.id,
        guestName: block.guest_name ?? "",
        channelLabel: block.reason ?? null,
      }));

    const staffClosures = allBlocks
      .filter((block) => !isChannelBlockRow(block))
      .map((block) => ({
        roomId: block.room_id,
        startDate: block.start_date,
        endDate: block.end_date,
      }));

    return {
      status: "ok",
      nights: computeGuestNightAvailability({
        rooms,
        fromIso,
        toIso,
        bookings,
        channelBlocks,
        staffClosures,
        inventoryLookup: buildInventoryLookup(inventoryResult.entries),
        units,
      }),
    };
  } catch {
    return { status: "verify-failed", nights: {} };
  }
}
