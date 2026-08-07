import { randomUUID } from "node:crypto";
import {
  guestHasConversationLink,
  WALK_IN_GUEST_EMAIL,
} from "@/lib/booking-chat";
import {
  inferBookingSourceFromChannelLabel,
  isOtaBookingSource,
  parseBookingSource,
  type BookingSource,
} from "@/lib/booking-source";
import { getStaffRooms } from "@/lib/rooms";
import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
  type RoomBlockRow,
} from "@/lib/supabase";
import { countStayNights, isStayLengthAllowed } from "@/lib/stay-dates";
import { resolveStayStatusFromDates } from "@/lib/stay-status";

export type ChannelBookingInsert = {
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  room_id: string;
  room_name: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  estimated_total: number;
  note: string;
  staff_note: string | null;
  status: "confirmed";
  stay_status: ReturnType<typeof resolveStayStatusFromDates>;
  deposit_amount: number | null;
  deposit_paid_at: string;
  booking_source: BookingSource;
  conversation_token: string | null;
  room_unit_id: string | null;
};

function resolveChannelBookingSource(
  row: Pick<RoomBlockRow, "staff_booking_source" | "ical_feed_id">,
  channelLabel: string | null,
): BookingSource {
  const staffSource = parseBookingSource(row.staff_booking_source);
  if (staffSource) {
    return staffSource;
  }
  return inferBookingSourceFromChannelLabel(channelLabel) ?? "airbnb";
}

/** True when a room_block is a leftover OTA/iCal stay (not a staff closure). */
export function isPromotableChannelBlock(
  row: Pick<RoomBlockRow, "ical_feed_id" | "staff_booking_source">,
) {
  if (row.ical_feed_id) {
    return true;
  }
  return isOtaBookingSource(parseBookingSource(row.staff_booking_source));
}

/**
 * Map a channel room_block into a booking_requests insert (walk-in-shaped).
 * Returns null when dates/nights are invalid.
 */
export function bookingInsertFromChannelBlock(input: {
  row: RoomBlockRow;
  roomName: string;
  channelLabel?: string | null;
  paidAt?: string;
}): ChannelBookingInsert | null {
  const { row, roomName, channelLabel = null, paidAt = new Date().toISOString() } =
    input;
  const nights = countStayNights(row.start_date, row.end_date);
  if (nights === null || !isStayLengthAllowed(nights)) {
    return null;
  }

  const rawEmail = (row.guest_email ?? "").trim().toLowerCase();
  const guestEmail = guestHasConversationLink(rawEmail)
    ? rawEmail
    : WALK_IN_GUEST_EMAIL;
  const guestName =
    row.guest_name?.trim() ||
    channelLabel?.trim() ||
    "Channel guest";

  return {
    guest_name: guestName.length >= 2 ? guestName : "Channel guest",
    guest_email: guestEmail,
    guest_phone: row.guest_phone?.trim() || "",
    room_id: row.room_id,
    room_name: roomName,
    arrival_date: row.start_date,
    departure_date: row.end_date,
    nights,
    estimated_total: 0,
    note: "Promoted from channel reservation",
    staff_note: row.staff_note?.trim() || null,
    status: "confirmed",
    stay_status: resolveStayStatusFromDates(row.start_date, row.end_date),
    // OTA already collected payment on the channel — mark paid like a settled walk-in.
    deposit_amount: null,
    deposit_paid_at: paidAt,
    booking_source: resolveChannelBookingSource(row, channelLabel),
    conversation_token: guestHasConversationLink(guestEmail)
      ? randomUUID()
      : null,
    room_unit_id: row.room_unit_id ?? null,
  };
}

/**
 * Turn leftover iCal/OTA room_blocks into booking_requests so staff get the
 * same Conversation + cancel flow as walk-ins. Then drop empty iCal feeds.
 */
export async function promoteChannelReservationsToBookings() {
  if (!hasStaffSupabaseConfig()) {
    return {
      promoted: 0,
      skipped: 0,
      deletedFeeds: 0,
      error: null as string | null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();
    const rooms = await getStaffRooms();
    const roomNameById = new Map(rooms.map((room) => [room.id, room.name]));

    const { data: feedRows } = await supabase
      .from("room_ical_feeds")
      .select("id, label");
    const channelLabelById = new Map(
      (feedRows ?? []).map((feed) => [
        feed.id as string,
        (feed.label?.trim() || "Channel") as string,
      ]),
    );

    const { data: blocks, error: listError } = await supabase
      .from("room_blocks")
      .select("*")
      .or(
        "ical_feed_id.not.is.null,staff_booking_source.in.(airbnb,expedia,booking)",
      );

    if (listError) {
      return {
        promoted: 0,
        skipped: 0,
        deletedFeeds: 0,
        error: listError.message,
      };
    }

    let promoted = 0;
    let skipped = 0;

    for (const raw of blocks ?? []) {
      const row = raw as RoomBlockRow;
      if (!isPromotableChannelBlock(row)) {
        skipped += 1;
        continue;
      }

      const channelLabel = row.ical_feed_id
        ? (channelLabelById.get(row.ical_feed_id) ?? "Channel")
        : null;
      const roomName =
        roomNameById.get(row.room_id) ?? row.room_id ?? "Room";
      const insert = bookingInsertFromChannelBlock({
        row,
        roomName,
        channelLabel,
      });

      if (!insert) {
        skipped += 1;
        continue;
      }

      const { error: insertError } = await supabase
        .from("booking_requests")
        .insert(insert);

      if (insertError) {
        skipped += 1;
        continue;
      }

      const { error: deleteError } = await supabase
        .from("room_blocks")
        .delete()
        .eq("id", row.id);

      if (deleteError) {
        skipped += 1;
        continue;
      }

      promoted += 1;
    }

    const { data: feeds, error: feedsListError } = await supabase
      .from("room_ical_feeds")
      .select("id");

    if (feedsListError) {
      return {
        promoted,
        skipped,
        deletedFeeds: 0,
        error: feedsListError.message,
      };
    }

    const deletedFeeds = feeds?.length ?? 0;
    if (deletedFeeds > 0) {
      const { error: deleteFeedsError } = await supabase
        .from("room_ical_feeds")
        .delete()
        .not("id", "is", null);

      if (deleteFeedsError) {
        return {
          promoted,
          skipped,
          deletedFeeds: 0,
          error: deleteFeedsError.message,
        };
      }
    }

    return {
      promoted,
      skipped,
      deletedFeeds,
      error: null as string | null,
    };
  } catch {
    return {
      promoted: 0,
      skipped: 0,
      deletedFeeds: 0,
      error: "Supabase is not configured correctly.",
    };
  }
}

/**
 * @deprecated Prefer promoteChannelReservationsToBookings — converts OTA
 * stays into booking_requests (with Conversation) instead of only deleting.
 */
export async function purgeIcalSyncedChannelBlocks() {
  const result = await promoteChannelReservationsToBookings();
  return {
    deletedBlocks: result.promoted,
    deletedFeeds: result.deletedFeeds,
    error: result.error,
  };
}
