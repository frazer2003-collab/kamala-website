import { type RoomPromotionRate } from "@/lib/pricing";
import { getTodayIso } from "@/lib/calendar";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomPromotionRow,
} from "@/lib/supabase";

export type StaffRoomPromotion = RoomPromotionRate & {
  id: string;
  createdAt: string;
};

function mapPromotionRow(row: RoomPromotionRow): StaffRoomPromotion {
  return {
    id: row.id,
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    percentOff: row.percent_off,
    label: row.label,
    createdAt: row.created_at,
  };
}

function mapPromotionRates(rows: RoomPromotionRow[]): RoomPromotionRate[] {
  return rows.map((row) => ({
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    percentOff: row.percent_off,
    label: row.label,
  }));
}

export async function getStaffRoomPromotions(): Promise<StaffRoomPromotion[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("room_promotions")
    .select("*")
    .order("start_date", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapPromotionRow);
}

export async function getPublicRoomPromotions(): Promise<RoomPromotionRate[]> {
  return getPublicRoomPromotionsCached();
}

const getPublicRoomPromotionsCached = cache(
  unstable_cache(fetchPublicRoomPromotions, ["public-promotions"], {
    revalidate: 120,
    tags: [PUBLIC_CACHE_TAGS.publicPromotions],
  }),
);

async function fetchPublicRoomPromotions(): Promise<RoomPromotionRate[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const today = getTodayIso();
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("room_promotions")
    .select("*")
    .gte("end_date", today)
    .order("start_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return mapPromotionRates(data);
}

export async function getRoomPromotionsForStay(
  roomId: string,
  arrival: string,
  departure: string,
): Promise<RoomPromotionRate[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("room_promotions")
    .select("*")
    .eq("room_id", roomId)
    .lt("start_date", departure)
    .gte("end_date", arrival)
    .order("start_date", { ascending: true });

  if (error || !data) {
    return [];
  }

  return mapPromotionRates(data);
}
