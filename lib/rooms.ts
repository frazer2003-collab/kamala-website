import { cache } from "react";
import { unstable_cache } from "next/cache";
import { rooms as fallbackRooms, type Room } from "@/lib/content";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import {
  createGuestSupabaseClient,
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomRow,
} from "@/lib/supabase";

const PUBLIC_ROOM_COLUMNS =
  "id, name, short_name, rate, sleeps, outlook, available_count, summary, amenities, tone, image_url, gallery_urls, sort_order";

function mapRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    rate: row.rate,
    sleeps: row.sleeps,
    outlook: row.outlook,
    availableCount: row.available_count,
    summary: row.summary,
    amenities: row.amenities,
    tone: row.tone,
    imageUrl: row.image_url,
    galleryUrls: row.gallery_urls ?? [],
    icalExportToken: row.ical_export_token ?? null,
  };
}

async function fetchPublicRooms() {
  try {
    const supabase = createGuestSupabaseClient();
    const { data, error } = await supabase
      .from("rooms")
      .select(PUBLIC_ROOM_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("rate", { ascending: true });

    if (error || !data || data.length === 0) {
      return fallbackRooms;
    }

    return data.map((row) => mapRoom(row as RoomRow));
  } catch {
    return fallbackRooms;
  }
}

const getPublicRoomsCached = cache(
  unstable_cache(fetchPublicRooms, ["public-rooms"], {
    revalidate: 120,
    tags: [PUBLIC_CACHE_TAGS.publicRooms],
  }),
);

export async function getPublicRooms() {
  return getPublicRoomsCached();
}

export async function getStaffRooms() {
  if (!hasStaffSupabaseConfig()) {
    return fallbackRooms;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("rate", { ascending: true });

    if (error || !data || data.length === 0) {
      return fallbackRooms;
    }

    return data.map(mapRoom);
  } catch {
    return fallbackRooms;
  }
}

export async function getRoomForBooking(roomId: string) {
  if (hasStaffSupabaseConfig()) {
    try {
      const supabase = createStaffSupabaseClient();
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (!error && data) {
        return mapRoom(data);
      }
    } catch {
      // Fall through to static room catalog.
    }
  }

  return fallbackRooms.find((room) => room.id === roomId) ?? null;
}
