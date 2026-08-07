import {
  formatBookingSource,
  inferBookingSourceFromChannelLabel,
  isOtaBookingSource,
  parseBookingSource,
  type BookingSource,
} from "@/lib/booking-source";
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
  /** Staff override, or inferred from channel label when unset. */
  bookingSource: BookingSource | null;
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
  const staffSource = parseBookingSource(row.staff_booking_source);
  const channelLabel = icalFeedId
    ? (channelLabelById?.get(icalFeedId) ?? "Channel")
    : isOtaBookingSource(staffSource)
      ? formatBookingSource(staffSource)
      : null;

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
    bookingSource: staffSource ?? inferBookingSourceFromChannelLabel(channelLabel),
    icalFeedId,
    channelLabel,
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

/** OTA reservations — legacy iCal imports or staff-tagged channel blocks. */
export function isChannelReservation(block: StaffRoomBlock) {
  return block.icalFeedId !== null || isOtaBookingSource(block.bookingSource);
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
        error: "Could not load room blocks. Run supabase/schema.sql in Supabase.",
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

/** OTA/channel reservations with check-in inside a date range (for reservations ledger). */
export async function getChannelReservationsForRange(fromIso: string, toIso: string) {
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
        .gte("start_date", fromIso)
        .lte("start_date", toIso)
        .order("start_date", { ascending: true })
        .limit(500),
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

    const blocks = data
      .map((row) =>
        mapRoomBlock(row, channelLabelById, unitMap.get(row.id) ?? row.room_unit_id ?? null),
      )
      .filter(isChannelReservation);

    return {
      blocks,
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

/** Channel stays whose nights overlap [fromIso, toIso] inclusive (for Finance). */
export async function getChannelBlocksOverlappingRange(
  fromIso: string,
  toIso: string,
) {
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
        .lte("start_date", toIso)
        .gt("end_date", fromIso)
        .order("start_date", { ascending: true })
        .limit(500),
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
      blocks: data
        .map((row) =>
          mapRoomBlock(
            row,
            channelLabelById,
            unitMap.get(row.id) ?? row.room_unit_id ?? null,
          ),
        )
        .filter(isChannelReservation),
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

/** Non-channel staff closes whose nights overlap the range (for Finance capacity). */
export async function getStaffClosureBlocksOverlappingRange(
  fromIso: string,
  toIso: string,
) {
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
        .lte("start_date", toIso)
        .gt("end_date", fromIso)
        .order("start_date", { ascending: true })
        .limit(500),
      getChannelLabelMap(supabase),
      getBlockRoomUnitMap(supabase),
    ]);

    if (error || !data) {
      return {
        blocks: [] as StaffRoomBlock[],
        source: "sample" as const,
        error: "Could not load closed dates.",
      };
    }

    return {
      blocks: data
        .map((row) =>
          mapRoomBlock(
            row,
            channelLabelById,
            unitMap.get(row.id) ?? row.room_unit_id ?? null,
          ),
        )
        .filter((block) => !isChannelReservation(block)),
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

export {
  promoteChannelReservationsToBookings,
  purgeIcalSyncedChannelBlocks,
} from "@/lib/promote-channel-bookings";
