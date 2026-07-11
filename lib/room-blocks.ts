import { getCalendarMonthBounds } from "@/lib/calendar";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomBlockRow,
} from "@/lib/supabase";

export type StaffRoomBlock = {
  id: string;
  databaseId: string | null;
  roomId: string;
  startDate: string;
  endDate: string;
  reason: string;
  staffNote: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  icalFeedId: string | null;
  channelLabel: string | null;
  roomUnitId: string | null;
  roomNumber: string | null;
};

function mapRoomBlock(
  row: RoomBlockRow,
  channelLabelById?: Map<string, string>,
  roomUnitIdOverride?: string | null,
): StaffRoomBlock {
  const icalFeedId = row.ical_feed_id ?? null;

  return {
    id: row.id.slice(0, 8).toUpperCase(),
    databaseId: row.id,
    roomId: row.room_id,
    startDate: row.start_date,
    endDate: row.end_date,
    reason: row.reason?.trim() || "Closed",
    staffNote: row.staff_note ?? "",
    guestName: row.guest_name ?? "",
    guestEmail: row.guest_email ?? "",
    guestPhone: row.guest_phone ?? "",
    icalFeedId,
    channelLabel: icalFeedId ? (channelLabelById?.get(icalFeedId) ?? "Channel") : null,
    roomUnitId: roomUnitIdOverride ?? row.room_unit_id ?? null,
    roomNumber: null,
  };
}

async function getBlockRoomUnitMap(
  supabase: ReturnType<typeof createStaffSupabaseClient>,
) {
  const map = new Map<string, string>();
  const { data, error } = await supabase.rpc("staff_room_block_unit_map");
  if (error || !data) {
    return map;
  }

  for (const row of data) {
    if (row.id && row.room_unit_id) {
      map.set(row.id, row.room_unit_id);
    }
  }

  return map;
}

/** OTA reservations imported from a channel calendar (Airbnb, Booking.com, …). */
export function isChannelReservation(block: StaffRoomBlock) {
  return block.icalFeedId !== null;
}

export function getStaffRoomBlockKey(block: StaffRoomBlock) {
  return block.databaseId ?? block.id;
}

async function getChannelLabelMap(
  supabase: ReturnType<typeof createStaffSupabaseClient>,
) {
  const map = new Map<string, string>();
  const { data, error } = await supabase
    .from("room_ical_feeds")
    .select("id, label");

  if (error || !data) {
    return map;
  }

  for (const feed of data) {
    map.set(feed.id, feed.label?.trim() || "Channel");
  }

  return map;
}

/** Month blocks + all channel reservations in one round-trip (shared label/unit maps). */
export async function getStaffCalendarBlocks(month: { year: number; month: number }) {
  if (!hasStaffSupabaseConfig()) {
    return {
      monthBlocks: [] as StaffRoomBlock[],
      channelBlocks: [] as StaffRoomBlock[],
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { monthStart, monthEnd } = getCalendarMonthBounds(month.year, month.month);
    const [channelLabelById, unitMap, monthResult, channelResult] = await Promise.all([
      getChannelLabelMap(supabase),
      getBlockRoomUnitMap(supabase),
      supabase
        .from("room_blocks")
        .select("*")
        .lte("start_date", monthEnd)
        .gt("end_date", monthStart)
        .order("start_date", { ascending: true }),
      supabase
        .from("room_blocks")
        .select("*")
        .not("ical_feed_id", "is", null)
        .order("start_date", { ascending: true })
        .limit(300),
    ]);

    if (monthResult.error || !monthResult.data) {
      return {
        monthBlocks: [] as StaffRoomBlock[],
        channelBlocks: [] as StaffRoomBlock[],
        source: "sample" as const,
        error: "Could not load room blocks. Run supabase/migrate-room-blocks.sql.",
      };
    }

    const mapRow = (row: RoomBlockRow) =>
      mapRoomBlock(row, channelLabelById, unitMap.get(row.id) ?? row.room_unit_id ?? null);

    const monthBlocks = monthResult.data.map(mapRow);
    const channelBlocks =
      channelResult.error || !channelResult.data
        ? monthBlocks.filter(isChannelReservation)
        : channelResult.data.map(mapRow);

    return {
      monthBlocks,
      channelBlocks,
      source: "supabase" as const,
      error: channelResult.error ? "Could not load all channel reservations." : null,
    };
  } catch {
    return {
      monthBlocks: [] as StaffRoomBlock[],
      channelBlocks: [] as StaffRoomBlock[],
      source: "sample" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}

export async function getRoomBlocksForMonth(month: { year: number; month: number }) {
  const result = await getStaffCalendarBlocks(month);
  return {
    blocks: result.monthBlocks,
    source: result.source,
    error: result.error && !result.monthBlocks.length ? result.error : null,
  };
}

export async function getRoomBlockById(blockId: string) {
  if (!blockId || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const [{ data, error }, unitMap] = await Promise.all([
      supabase.from("room_blocks").select("*").eq("id", blockId).maybeSingle(),
      getBlockRoomUnitMap(supabase),
    ]);

    if (error || !data) {
      return null;
    }

    let channelLabelById: Map<string, string> | undefined;

    if (data.ical_feed_id) {
      channelLabelById = await getChannelLabelMap(supabase);
    }

    return mapRoomBlock(
      data,
      channelLabelById,
      unitMap.get(data.id) ?? data.room_unit_id ?? null,
    );
  } catch {
    return null;
  }
}

/** All OTA/channel reservations (for room-number conflict checks). */
export async function getChannelReservations() {
  if (!hasStaffSupabaseConfig()) {
    return {
      blocks: [] as StaffRoomBlock[],
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const [{ data, error }, channelLabelById, unitMap] = await Promise.all([
      supabase
        .from("room_blocks")
        .select("*")
        .not("ical_feed_id", "is", null)
        .order("start_date", { ascending: true })
        .limit(300),
      getChannelLabelMap(supabase),
      getBlockRoomUnitMap(supabase),
    ]);

    if (error || !data) {
      return {
        blocks: [] as StaffRoomBlock[],
        source: "sample" as const,
        error: "Could not load channel reservations.",
      };
    }

    return {
      blocks: data.map((row) =>
        mapRoomBlock(row, channelLabelById, unitMap.get(row.id) ?? row.room_unit_id ?? null),
      ),
      source: "supabase" as const,
      error: null,
    };
  } catch {
    return {
      blocks: [] as StaffRoomBlock[],
      source: "sample" as const,
      error: "Supabase is not configured correctly.",
    };
  }
}
