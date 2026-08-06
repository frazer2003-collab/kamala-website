import {
  createStaffSupabaseClient,
  hasStaffSupabaseConfig,
} from "@/lib/supabase";

/** Historical cleanup window: leftover No # stays cluttering July 2026. */
export const JULY_2026_START = "2026-07-01";
export const JULY_2026_END_EXCLUSIVE = "2026-08-01";

/** Half-open stay [start, end) overlaps July 2026. */
export function stayOverlapsJuly2026(startIso: string, endIso: string) {
  return startIso < JULY_2026_END_EXCLUSIVE && endIso > JULY_2026_START;
}

function isUnassignedUnit(
  roomUnitId: string | null | undefined,
  knownUnitIds: ReadonlySet<string>,
) {
  return !roomUnitId || !knownUnitIds.has(roomUnitId);
}

/**
 * Delete website bookings and manual channel blocks that need a room #
 * and overlap July 2026. Idempotent; safe to call on every staff calendar load.
 */
export async function purgeUnassignedJuly2026Stays() {
  if (!hasStaffSupabaseConfig()) {
    return {
      deletedBookings: 0,
      deletedBlocks: 0,
      error: null as string | null,
    };
  }

  try {
    const supabase = createStaffSupabaseClient();

    const { data: units, error: unitsError } = await supabase
      .from("room_units")
      .select("id");

    if (unitsError) {
      return {
        deletedBookings: 0,
        deletedBlocks: 0,
        error: unitsError.message,
      };
    }

    const knownUnitIds = new Set((units ?? []).map((unit) => unit.id));

    const { data: bookings, error: bookingsError } = await supabase
      .from("booking_requests")
      .select("id, room_unit_id, arrival_date, departure_date")
      .lt("arrival_date", JULY_2026_END_EXCLUSIVE)
      .gt("departure_date", JULY_2026_START);

    if (bookingsError) {
      return {
        deletedBookings: 0,
        deletedBlocks: 0,
        error: bookingsError.message,
      };
    }

    const bookingIds = (bookings ?? [])
      .filter(
        (row) =>
          stayOverlapsJuly2026(row.arrival_date, row.departure_date) &&
          isUnassignedUnit(row.room_unit_id, knownUnitIds),
      )
      .map((row) => row.id);

    let deletedBookings = 0;
    if (bookingIds.length > 0) {
      const { error: deleteBookingsError } = await supabase
        .from("booking_requests")
        .delete()
        .in("id", bookingIds);

      if (deleteBookingsError) {
        return {
          deletedBookings: 0,
          deletedBlocks: 0,
          error: deleteBookingsError.message,
        };
      }
      deletedBookings = bookingIds.length;
    }

    const { data: blocks, error: blocksError } = await supabase
      .from("room_blocks")
      .select("id, room_unit_id, start_date, end_date")
      .lt("start_date", JULY_2026_END_EXCLUSIVE)
      .gt("end_date", JULY_2026_START);

    if (blocksError) {
      return {
        deletedBookings,
        deletedBlocks: 0,
        error: blocksError.message,
      };
    }

    const blockIds = (blocks ?? [])
      .filter(
        (row) =>
          stayOverlapsJuly2026(row.start_date, row.end_date) &&
          isUnassignedUnit(row.room_unit_id, knownUnitIds),
      )
      .map((row) => row.id);

    let deletedBlocks = 0;
    if (blockIds.length > 0) {
      const { error: deleteBlocksError } = await supabase
        .from("room_blocks")
        .delete()
        .in("id", blockIds);

      if (deleteBlocksError) {
        return {
          deletedBookings,
          deletedBlocks: 0,
          error: deleteBlocksError.message,
        };
      }
      deletedBlocks = blockIds.length;
    }

    return { deletedBookings, deletedBlocks, error: null as string | null };
  } catch {
    return {
      deletedBookings: 0,
      deletedBlocks: 0,
      error: "Supabase is not configured correctly.",
    };
  }
}
