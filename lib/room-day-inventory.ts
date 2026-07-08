import { monthOverlapsBooking } from "@/lib/calendar";
import type { Room } from "@/lib/content";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomDayInventoryRow,
} from "@/lib/supabase";

export type RoomDayInventory = {
  roomId: string;
  date: string;
  roomsToSell: number;
};

function mapInventoryRow(row: RoomDayInventoryRow): RoomDayInventory {
  return {
    roomId: row.room_id,
    date: row.date,
    roomsToSell: row.rooms_to_sell,
  };
}

export function buildInventoryLookup(entries: RoomDayInventory[]) {
  const lookup = new Map<string, number>();

  for (const entry of entries) {
    lookup.set(`${entry.roomId}:${entry.date}`, entry.roomsToSell);
  }

  return lookup;
}

export function getRoomsToSellForDay(
  room: Room,
  iso: string,
  inventoryLookup: Map<string, number>,
) {
  return inventoryLookup.get(`${room.id}:${iso}`) ?? room.availableCount;
}

export function eachIsoDayInclusive(startIso: string, endIso: string) {
  const days: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);

  while (cursor <= end) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function addIsoDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function getRoomDayInventoryForMonth(month: { year: number; month: number }) {
  if (!hasStaffSupabaseConfig()) {
    return {
      entries: [] as RoomDayInventory[],
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("room_day_inventory")
      .select("*")
      .order("date", { ascending: true })
      .limit(500);

    if (error || !data) {
      return {
        entries: [] as RoomDayInventory[],
        source: "sample" as const,
        error: "Could not load day inventory. Run supabase/migrate-room-day-inventory.sql.",
      };
    }

    return {
      entries: data
        .map(mapInventoryRow)
        .filter((entry) =>
          monthOverlapsBooking(
            { arrivalDate: entry.date, departureDate: addIsoDays(entry.date, 1) },
            month.year,
            month.month,
          ),
        ),
      source: "supabase" as const,
      error: null,
    };
  } catch {
    return {
      entries: [] as RoomDayInventory[],
      source: "sample" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getRoomDayInventoryForRange(
  roomId: string,
  arrival: string,
  departure: string,
) {
  if (!hasStaffSupabaseConfig()) {
    return [] as RoomDayInventory[];
  }

  try {
    const supabase = createStaffSupabaseClient();
    const lastNight = addIsoDays(departure, -1);
    const { data, error } = await supabase
      .from("room_day_inventory")
      .select("*")
      .eq("room_id", roomId)
      .gte("date", arrival)
      .lte("date", lastNight)
      .order("date", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(mapInventoryRow);
  } catch {
    return [];
  }
}
