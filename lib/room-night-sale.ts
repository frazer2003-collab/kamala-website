import { bookingOccupiesDay } from "@/lib/calendar";
import { countNetBookedForRoomDay } from "@/lib/calendar-timeline";
import type { Room } from "@/lib/content";
import { getRoomsToSellForDay } from "@/lib/room-day-inventory";
import { getTypeUnitIdSet, type RoomUnit } from "@/lib/room-units";

export type RoomNightSaleReason =
  | { kind: "open"; roomsToSell: number; netBooked: number }
  | { kind: "staff-closed" }
  | { kind: "allotment-zero" }
  | { kind: "sold-out"; roomsToSell: number; netBooked: number };

/**
 * Why a room type night is not guest-bookable — including cases that leave
 * door # rows empty (type close, rooms-to-sell 0, unassigned stays).
 */
export function explainRoomNightSale({
  room,
  iso,
  bookings,
  channelBlocks,
  staffClosures,
  inventoryLookup,
  units,
}: {
  room: Room;
  iso: string;
  bookings: Array<{
    roomId: string;
    roomUnitId?: string | null;
    arrivalDate: string;
    departureDate: string;
  }>;
  channelBlocks: Array<{
    roomId: string;
    roomUnitId?: string | null;
    startDate: string;
    endDate: string;
  }>;
  staffClosures: Array<{ roomId: string; startDate: string; endDate: string }>;
  inventoryLookup: Map<string, number>;
  units: RoomUnit[];
}): RoomNightSaleReason {
  const closedByStaff = staffClosures.some(
    (block) =>
      block.roomId === room.id &&
      bookingOccupiesDay(
        { arrivalDate: block.startDate, departureDate: block.endDate },
        iso,
      ),
  );

  if (closedByStaff) {
    return { kind: "staff-closed" };
  }

  const roomsToSell = getRoomsToSellForDay(room, iso, inventoryLookup);
  if (roomsToSell <= 0) {
    return { kind: "allotment-zero" };
  }

  const netBooked = countNetBookedForRoomDay({
    roomId: room.id,
    iso,
    bookings,
    channelBlocks,
    typeUnitIds: getTypeUnitIdSet(units, room.id),
  });

  if (netBooked >= roomsToSell) {
    return { kind: "sold-out", roomsToSell, netBooked };
  }

  return { kind: "open", roomsToSell, netBooked };
}

export function formatRoomNightSaleReason(reason: RoomNightSaleReason): string | null {
  switch (reason.kind) {
    case "open":
      return null;
    case "staff-closed":
      return "Closed for this night (type close). No door bar is shown — reopen from Close, or check Allotment.";
    case "allotment-zero":
      return "Rooms to sell is 0 for this night. Door rows stay empty until allotment is raised.";
    case "sold-out":
      return `Full: ${reason.netBooked} stay${reason.netBooked === 1 ? "" : "s"} against ${reason.roomsToSell} to sell. Check Needs room # above if this door looks empty.`;
  }
}
