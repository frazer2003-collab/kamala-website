import { getCalendarMonthBounds } from "@/lib/calendar";
import {
  addIsoDays,
  eachIsoDayInclusive,
} from "@/lib/room-day-inventory";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomDayRateRow,
} from "@/lib/supabase";

export type RoomDayRate = {
  roomId: string;
  date: string;
  nightlyRate: number;
};

function mapRateRow(row: RoomDayRateRow): RoomDayRate {
  return {
    roomId: row.room_id,
    date: row.date,
    nightlyRate: row.nightly_rate,
  };
}

export function buildRateLookup(entries: RoomDayRate[]) {
  const lookup = new Map<string, number>();

  for (const entry of entries) {
    lookup.set(`${entry.roomId}:${entry.date}`, entry.nightlyRate);
  }

  return lookup;
}

export async function getRoomDayRatesForMonth(month: { year: number; month: number }) {
  if (!hasStaffSupabaseConfig()) {
    return {
      entries: [] as RoomDayRate[],
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { monthStart, monthEnd } = getCalendarMonthBounds(month.year, month.month);
    const { data, error } = await supabase
      .from("room_day_rates")
      .select("*")
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true });

    if (error || !data) {
      return {
        entries: [] as RoomDayRate[],
        source: "sample" as const,
        error: "Could not load day rates. Run supabase/migrate-room-day-rates.sql.",
      };
    }

    return {
      entries: data.map(mapRateRow),
      source: "supabase" as const,
      error: null,
    };
  } catch {
    return {
      entries: [] as RoomDayRate[],
      source: "sample" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getRoomDayRatesForRange(
  roomId: string,
  arrival: string,
  departure: string,
) {
  if (!hasStaffSupabaseConfig()) {
    return [] as RoomDayRate[];
  }

  try {
    const supabase = createStaffSupabaseClient();
    const lastNight = addIsoDays(departure, -1);
    const { data, error } = await supabase
      .from("room_day_rates")
      .select("*")
      .eq("room_id", roomId)
      .gte("date", arrival)
      .lte("date", lastNight);

    if (error || !data) {
      return [] as RoomDayRate[];
    }

    return data.map(mapRateRow);
  } catch {
    return [] as RoomDayRate[];
  }
}

/** All rooms' temp rates covering nights of a guest stay (arrival inclusive, departure exclusive). */
export async function getRoomDayRatesForStay(arrival: string, departure: string) {
  if (!hasStaffSupabaseConfig() || !arrival || !departure || departure <= arrival) {
    return [] as RoomDayRate[];
  }

  try {
    const supabase = createStaffSupabaseClient();
    const lastNight = addIsoDays(departure, -1);
    const { data, error } = await supabase
      .from("room_day_rates")
      .select("*")
      .gte("date", arrival)
      .lte("date", lastNight);

    if (error || !data) {
      return [] as RoomDayRate[];
    }

    return data.map(mapRateRow);
  } catch {
    return [] as RoomDayRate[];
  }
}

export { eachIsoDayInclusive };
