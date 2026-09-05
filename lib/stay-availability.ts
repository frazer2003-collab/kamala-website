import type { Room } from "@/lib/content";
import { bookingOccupiesDay } from "@/lib/calendar";
import { countNetBookedForRoomDay } from "@/lib/calendar-timeline";
import { bookingReservesRoom } from "@/lib/booking-reservation";
import { isChannelBlockRow } from "@/lib/booking-source";
import {
  buildInventoryLookup,
  getRoomsToSellForDay,
  loadRoomDayInventoryForRange,
} from "@/lib/room-day-inventory";
import {
  getAssignableUnitsForStay,
  getStaffRoomUnits,
  getTypeUnitIdSet,
  getUnitsForRoomType,
  occupancyFromBooking,
  occupancyFromChannelBlock,
  type RoomUnit,
  type UnitOccupancy,
} from "@/lib/room-units";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

export type RoomStayAvailability = {
  roomId: string;
  totalRooms: number;
  availableCount: number;
};

export type RoomsStayAvailabilityResult = {
  status: "ok" | "verify-failed";
  rooms: RoomStayAvailability[];
};

type StayBookingOccupancy = {
  roomId: string;
  roomUnitId: string | null;
  arrivalDate: string;
  departureDate: string;
  databaseId: string | null;
  guest: string;
};

type StayChannelOccupancy = {
  roomId: string;
  roomUnitId: string | null;
  startDate: string;
  endDate: string;
  databaseId: string | null;
  guestName: string;
  channelLabel: string | null;
};

type StaffClosure = {
  roomId: string;
  startDate: string;
  endDate: string;
};

function closedAvailability(rooms: Room[]): RoomStayAvailability[] {
  return rooms.map((room) => ({
    roomId: room.id,
    totalRooms: room.availableCount,
    availableCount: 0,
  }));
}

/**
 * Guest-facing rooms left for a stay: allotment nights ∩ free doors.
 * Matches checkout’s door gate so Reserve never leads to a late “unavailable”.
 */
export function computeGuestRoomStayAvailableCount({
  room,
  arrival,
  departure,
  bookings,
  channelBlocks,
  staffClosures,
  inventoryLookup,
  units,
}: {
  room: Room;
  arrival: string;
  departure: string;
  bookings: StayBookingOccupancy[];
  channelBlocks: StayChannelOccupancy[];
  staffClosures: StaffClosure[];
  inventoryLookup: Map<string, number>;
  units: RoomUnit[];
}) {
  const typeUnitIds = getTypeUnitIdSet(units, room.id);
  const typeUnits = getUnitsForRoomType(units, room.id);
  let minAvailable = room.availableCount;

  const nightCursor = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);

  while (nightCursor < end) {
    const iso = `${nightCursor.getFullYear()}-${String(nightCursor.getMonth() + 1).padStart(2, "0")}-${String(nightCursor.getDate()).padStart(2, "0")}`;

    const closedByStaff = staffClosures.some(
      (block) =>
        block.roomId === room.id &&
        bookingOccupiesDay(
          { arrivalDate: block.startDate, departureDate: block.endDate },
          iso,
        ),
    );

    if (closedByStaff) {
      return 0;
    }

    const roomsToSell = getRoomsToSellForDay(room, iso, inventoryLookup);
    const netBooked = countNetBookedForRoomDay({
      roomId: room.id,
      iso,
      bookings,
      channelBlocks,
      typeUnitIds,
    });
    const nightAvailable = Math.max(0, roomsToSell - netBooked);
    minAvailable = Math.min(minAvailable, nightAvailable);
    nightCursor.setDate(nightCursor.getDate() + 1);
  }

  if (typeUnits.length === 0) {
    return minAvailable;
  }

  const occupancies: UnitOccupancy[] = [
    ...bookings.map(occupancyFromBooking),
    ...channelBlocks.map(occupancyFromChannelBlock),
  ];
  const doorCap = getAssignableUnitsForStay({
    units,
    roomId: room.id,
    arrivalDate: arrival,
    departureDate: departure,
    occupancies,
  }).length;

  return Math.min(minAvailable, doorCap);
}

export async function getRoomsStayAvailability(
  rooms: Room[],
  arrival: string,
  departure: string,
): Promise<RoomsStayAvailabilityResult> {
  if (!hasStaffSupabaseConfig() || rooms.length === 0) {
    return {
      status: "ok",
      rooms: rooms.map((room) => ({
        roomId: room.id,
        totalRooms: room.availableCount,
        availableCount: room.availableCount,
      })),
    };
  }

  const supabase = createStaffSupabaseClient();

  try {
    const [bookingsResult, inventoryResults, blocksResult, unitsResult] =
      await Promise.all([
        // All overlapping stays — door assignment can count toward a type
        // even when room_id is stale (same rule as the staff tape).
        supabase
          .from("booking_requests")
          .select(
            "id, room_id, room_unit_id, arrival_date, departure_date, status, deposit_paid_at, bank_transfer_claimed_at, guest_name",
          )
          .lt("arrival_date", departure)
          .gt("departure_date", arrival),
        Promise.all(
          rooms.map((room) => loadRoomDayInventoryForRange(room.id, arrival, departure)),
        ),
        supabase
          .from("room_blocks")
          .select(
            "id, room_id, room_unit_id, start_date, end_date, staff_booking_source, guest_name, reason",
          )
          .lt("start_date", departure)
          .gt("end_date", arrival),
        getStaffRoomUnits(),
      ]);

    if (bookingsResult.error || blocksResult.error) {
      return { status: "verify-failed", rooms: closedAvailability(rooms) };
    }

    if (inventoryResults.some((result) => !result.ok)) {
      return { status: "verify-failed", rooms: closedAvailability(rooms) };
    }

    const units = unitsResult.units;
    const bookings: StayBookingOccupancy[] = (bookingsResult.data ?? [])
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
    const channelBlocks: StayChannelOccupancy[] = allBlocks
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

    const staffClosures: StaffClosure[] = allBlocks
      .filter((block) => !isChannelBlockRow(block))
      .map((block) => ({
        roomId: block.room_id,
        startDate: block.start_date,
        endDate: block.end_date,
      }));

    const inventoryByRoom = inventoryResults.map((result) =>
      result.ok ? result.entries : [],
    );

    return {
      status: "ok",
      rooms: rooms.map((room, index) => {
        const inventoryLookup = buildInventoryLookup(inventoryByRoom[index] ?? []);
        const availableCount = computeGuestRoomStayAvailableCount({
          room,
          arrival,
          departure,
          bookings,
          channelBlocks,
          staffClosures,
          inventoryLookup,
          units,
        });

        return {
          roomId: room.id,
          totalRooms: room.availableCount,
          availableCount,
        };
      }),
    };
  } catch {
    return { status: "verify-failed", rooms: closedAvailability(rooms) };
  }
}

export function stayAvailabilityMap(entries: RoomStayAvailability[]) {
  return new Map(entries.map((entry) => [entry.roomId, entry.availableCount]));
}
