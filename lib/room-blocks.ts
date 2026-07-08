import { monthOverlapsBooking } from "@/lib/calendar";
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
};

function mapRoomBlock(
  row: RoomBlockRow,
  channelLabelById?: Map<string, string>,
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
  };
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

export async function getRoomBlocksForMonth(month: { year: number; month: number }) {
  if (!hasStaffSupabaseConfig()) {
    return {
      blocks: [] as StaffRoomBlock[],
      source: "sample" as const,
      error: null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const [{ data, error }, channelLabelById] = await Promise.all([
      supabase
        .from("room_blocks")
        .select("*")
        .order("start_date", { ascending: true })
        .limit(200),
      getChannelLabelMap(supabase),
    ]);

    if (error || !data) {
      return {
        blocks: [] as StaffRoomBlock[],
        source: "sample" as const,
        error: "Could not load room blocks. Run supabase/migrate-room-blocks.sql.",
      };
    }

    return {
      blocks: data
        .map((row) => mapRoomBlock(row, channelLabelById))
        .filter((block) =>
          monthOverlapsBooking(
            { arrivalDate: block.startDate, departureDate: block.endDate },
            month.year,
            month.month,
          ),
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

export async function getRoomBlockById(blockId: string) {
  if (!blockId || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("room_blocks")
      .select("*")
      .eq("id", blockId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    let channelLabelById: Map<string, string> | undefined;

    if (data.ical_feed_id) {
      channelLabelById = await getChannelLabelMap(supabase);
    }

    return mapRoomBlock(data, channelLabelById);
  } catch {
    return null;
  }
}
