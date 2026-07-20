import { cache } from "react";
import { unstable_cache } from "next/cache";
import { rooms as fallbackRooms, type Room } from "@/lib/content";
import { sanitizeMediaUrl, sanitizeMediaUrlList } from "@/lib/media-url";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache-tags";
import {
  createGuestSupabaseClient,
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomRow,
} from "@/lib/supabase";

const PUBLIC_ROOM_COLUMNS =
  "id, name, short_name, rate, sleeps, outlook, available_count, summary, amenities, tone, image_url, gallery_urls, sort_order";

/** Bundled covers when DB image_url / gallery are empty for known room ids. */
const bundledRoomMediaById = new Map(
  fallbackRooms.map((room) => [
    room.id,
    {
      imageUrl: room.imageUrl,
      galleryUrls: room.galleryUrls,
    },
  ]),
);

function resolveRoomImageUrl(imageUrl: string | null | undefined, roomId: string): string | null {
  return sanitizeMediaUrl(imageUrl) ?? bundledRoomMediaById.get(roomId)?.imageUrl ?? null;
}

function resolveRoomGalleryUrls(galleryUrls: string[] | null | undefined, roomId: string): string[] {
  const fromDb = sanitizeMediaUrlList(galleryUrls);
  if (fromDb.length > 0) {
    return fromDb;
  }
  return bundledRoomMediaById.get(roomId)?.galleryUrls ?? [];
}

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
    imageUrl: resolveRoomImageUrl(row.image_url, row.id),
    galleryUrls: resolveRoomGalleryUrls(row.gallery_urls, row.id),
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
  unstable_cache(fetchPublicRooms, ["public-rooms-v2"], {
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
