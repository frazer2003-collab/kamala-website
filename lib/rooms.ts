import { cache } from "react";
import { unstable_cache } from "next/cache";
import { rooms as fallbackRooms, type Room } from "@/lib/content";
import { sanitizeMediaUrl, sanitizeMediaUrlList } from "@/lib/media-url";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache-tags";
import {
  SAMPLE_ROOM_UNITS,
  getStaffRoomUnits,
  withSellableDoorCounts,
} from "@/lib/room-units";
import {
  createGuestSupabaseClient,
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomRow,
} from "@/lib/supabase";

const PUBLIC_ROOM_COLUMNS =
  "id, name, short_name, rate, sleeps, outlook, available_count, summary, amenities, tone, image_url, gallery_urls, sort_order";

/** Retired room type ids still present in older databases until migration runs. */
const RETIRED_ROOM_IDS = new Set(["veranda"]);

function withoutRetiredRooms(rooms: Room[]) {
  return rooms.filter((room) => !RETIRED_ROOM_IDS.has(room.id));
}

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
      return withSellableDoorCounts(fallbackRooms, SAMPLE_ROOM_UNITS);
    }

    // Same door-chart cap as staff — guest inventory must not sell a phantom
    // Deluxe door after loft took 114.
    return withSellableDoorCounts(
      withoutRetiredRooms(data.map((row) => mapRoom(row as RoomRow))),
      SAMPLE_ROOM_UNITS,
    );
  } catch {
    return withSellableDoorCounts(fallbackRooms, SAMPLE_ROOM_UNITS);
  }
}

const getPublicRoomsCached = cache(
  unstable_cache(fetchPublicRooms, ["public-rooms-v3"], {
    revalidate: 120,
    tags: [PUBLIC_CACHE_TAGS.publicRooms],
  }),
);

export async function getPublicRooms() {
  return getPublicRoomsCached();
}

export async function getStaffRooms() {
  if (!hasStaffSupabaseConfig()) {
    return withSellableDoorCounts(fallbackRooms, SAMPLE_ROOM_UNITS);
  }

  try {
    const supabase = createStaffSupabaseClient();
    const [{ data, error }, unitsResult] = await Promise.all([
      supabase
        .from("rooms")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("rate", { ascending: true }),
      getStaffRoomUnits(),
    ]);

    if (error || !data || data.length === 0) {
      return withSellableDoorCounts(fallbackRooms, unitsResult.units);
    }

    // Cap available_count to the door chart so Finance capacity cannot invent
    // phantom doors (Deluxe once stayed at 4 after loft took 114 → Oct 310).
    return withSellableDoorCounts(
      withoutRetiredRooms(data.map(mapRoom)),
      unitsResult.units,
    );
  } catch {
    return withSellableDoorCounts(fallbackRooms, SAMPLE_ROOM_UNITS);
  }
}

export async function getRoomForBooking(roomId: string) {
  if (RETIRED_ROOM_IDS.has(roomId)) {
    return null;
  }

  if (hasStaffSupabaseConfig()) {
    try {
      const supabase = createStaffSupabaseClient();
      const [{ data, error }, unitsResult] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        getStaffRoomUnits(),
      ]);

      if (!error && data) {
        return withSellableDoorCounts([mapRoom(data)], unitsResult.units)[0] ?? null;
      }
    } catch {
      // Fall through to static room catalog.
    }
  }

  const fallback = fallbackRooms.find((room) => room.id === roomId);
  if (!fallback) {
    return null;
  }
  return withSellableDoorCounts([fallback], SAMPLE_ROOM_UNITS)[0] ?? null;
}
