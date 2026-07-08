import type { Room } from "@/lib/content";
import { bookingOccupiesDay } from "@/lib/calendar";
import {
  buildInventoryLookup,
  getRoomDayInventoryForRange,
  getRoomsToSellForDay,
} from "@/lib/room-day-inventory";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

function bookingReservesRoom(booking: {
  status: string;
  deposit_paid_at: string | null;
}) {
  return (
    booking.status === "confirmed" ||
    (booking.deposit_paid_at !== null && booking.status !== "declined")
  );
}

export type RoomStayAvailability = {
  roomId: string;
  totalRooms: number;
  availableCount: number;
};

export async function getRoomsStayAvailability(
  rooms: Room[],
  arrival: string,
  departure: string,
): Promise<RoomStayAvailability[]> {
  if (!hasStaffSupabaseConfig() || rooms.length === 0) {
    return rooms.map((room) => ({
      roomId: room.id,
      totalRooms: room.availableCount,
      availableCount: room.availableCount,
    }));
  }

  const roomIds = rooms.map((room) => room.id);
  const supabase = createStaffSupabaseClient();
  const [bookingsResult, inventoryByRoom, blocksResult] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("room_id, arrival_date, departure_date, status, deposit_paid_at")
      .in("room_id", roomIds)
      .lt("arrival_date", departure)
      .gt("departure_date", arrival),
    Promise.all(
      rooms.map((room) => getRoomDayInventoryForRange(room.id, arrival, departure)),
    ),
    supabase
      .from("room_blocks")
      .select("room_id, start_date, end_date, ical_feed_id")
      .in("room_id", roomIds)
      .lt("start_date", departure)
      .gt("end_date", arrival),
  ]);
  const bookings = bookingsResult.error ? [] : (bookingsResult.data ?? []);
  const blocks = blocksResult.error ? [] : (blocksResult.data ?? []);

  const cursor = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);

  return rooms.map((room, index) => {
    const inventoryLookup = buildInventoryLookup(inventoryByRoom[index] ?? []);
    const roomBlocks = blocks.filter((block) => block.room_id === room.id);
    const roomBookings = bookings.filter((booking) => booking.room_id === room.id);
    let minAvailable = room.availableCount;

    const nightCursor = new Date(cursor);

    while (nightCursor < end) {
      const iso = `${nightCursor.getFullYear()}-${String(nightCursor.getMonth() + 1).padStart(2, "0")}-${String(nightCursor.getDate()).padStart(2, "0")}`;
      const dayBlocks = roomBlocks.filter((block) =>
        bookingOccupiesDay(
          { arrivalDate: block.start_date, departureDate: block.end_date },
          iso,
        ),
      );
      const closedByStaff = dayBlocks.some((block) => !block.ical_feed_id);

      if (closedByStaff) {
        minAvailable = 0;
        break;
      }

      const channelBooked = dayBlocks.length;
      const roomsToSell = getRoomsToSellForDay(room, iso, inventoryLookup);
      const directBooked = roomBookings.filter(
        (booking) =>
          bookingReservesRoom(booking) &&
          bookingOccupiesDay(
            {
              arrivalDate: booking.arrival_date,
              departureDate: booking.departure_date,
            },
            iso,
          ),
      ).length;
      const nightAvailable = Math.max(0, roomsToSell - directBooked - channelBooked);
      minAvailable = Math.min(minAvailable, nightAvailable);
      nightCursor.setDate(nightCursor.getDate() + 1);
    }

    return {
      roomId: room.id,
      totalRooms: room.availableCount,
      availableCount: minAvailable,
    };
  });
}

export function stayAvailabilityMap(entries: RoomStayAvailability[]) {
  return new Map(entries.map((entry) => [entry.roomId, entry.availableCount]));
}
