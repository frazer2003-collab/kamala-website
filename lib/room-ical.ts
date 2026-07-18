import { buildIcsCalendar, parseIcsEvents, type IcalEvent } from "@/lib/ical";
import { createStaffSupabaseClient, hasStaffSupabaseConfig, type RoomIcalFeedRow } from "@/lib/supabase";

export type RoomIcalFeed = {
  id: string;
  roomId: string;
  label: string;
  importUrl: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export type RoomIcalSyncResult = {
  feedId: string;
  label: string;
  ok: boolean;
  imported: number;
  error?: string;
};

export type RoomIcalRoomSyncResult = {
  results: RoomIcalSyncResult[];
  removedOrphans: number;
};

function mapRoomIcalFeed(row: RoomIcalFeedRow): RoomIcalFeed {
  return {
    id: row.id,
    roomId: row.room_id,
    label: row.label,
    importUrl: row.import_url,
    lastSyncedAt: row.last_synced_at,
    lastSyncError: row.last_sync_error,
  };
}

export function isValidIcalImportUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function getStaffRoomIcalFeeds() {
  if (!hasStaffSupabaseConfig()) {
    return [] as RoomIcalFeed[];
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("room_ical_feeds")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map(mapRoomIcalFeed);
  } catch {
    return [];
  }
}

export async function getRoomByIcalExportToken(token: string) {
  if (!token || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, short_name, ical_export_token")
      .eq("ical_export_token", token)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export async function getRoomIcalExportEvents(roomId: string): Promise<IcalEvent[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, guest_name, arrival_date, departure_date, status, deposit_paid_at")
      .eq("room_id", roomId)
      .eq("status", "confirmed")
      .order("arrival_date", { ascending: true }),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, reason, ical_feed_id")
      .eq("room_id", roomId)
      .is("ical_feed_id", null)
      .order("start_date", { ascending: true }),
  ]);

  const events: IcalEvent[] = [];

  for (const booking of bookings ?? []) {
    events.push({
      uid: `kamala-booking-${booking.id}`,
      summary: booking.guest_name,
      startDate: booking.arrival_date,
      endDate: booking.departure_date,
    });
  }

  for (const block of blocks ?? []) {
    events.push({
      uid: `kamala-block-${block.id}`,
      summary: block.reason?.trim() || "Closed",
      startDate: block.start_date,
      endDate: block.end_date,
    });
  }

  return events;
}

export async function buildRoomIcalExport(roomId: string, calendarName: string) {
  const events = await getRoomIcalExportEvents(roomId);
  return buildIcsCalendar(events, calendarName);
}

async function fetchIcalFeedText(importUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(importUrl, {
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent": "Kamala-Calendar-Sync/1.0",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Feed returned ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncRoomIcalFeed(feedId: string): Promise<RoomIcalSyncResult> {
  if (!hasStaffSupabaseConfig()) {
    return {
      feedId,
      label: "",
      ok: false,
      imported: 0,
      error: "Supabase is not configured.",
    };
  }

  const supabase = createStaffSupabaseClient();
  const { data: feed, error: feedError } = await supabase
    .from("room_ical_feeds")
    .select("*")
    .eq("id", feedId)
    .maybeSingle();

  if (feedError || !feed) {
    return {
      feedId,
      label: "",
      ok: false,
      imported: 0,
      error: "Could not find this calendar feed.",
    };
  }

  try {
    const icsText = await fetchIcalFeedText(feed.import_url);
    const events = parseIcsEvents(icsText);
    const seenUids = new Set<string>();

    for (const event of events) {
      seenUids.add(event.uid);

      const { data: existing } = await supabase
        .from("room_blocks")
        .select("id")
        .eq("ical_feed_id", feed.id)
        .eq("ical_uid", event.uid)
        .maybeSingle();

      const syncFields = {
        room_id: feed.room_id,
        start_date: event.startDate,
        end_date: event.endDate,
        reason: event.summary || feed.label,
        ical_feed_id: feed.id,
        ical_uid: event.uid,
      };

      if (existing) {
        const { error: updateError } = await supabase
          .from("room_blocks")
          .update(syncFields)
          .eq("id", existing.id);

        if (updateError) {
          throw new Error(updateError.message);
        }
      } else {
        const { error: insertError } = await supabase.from("room_blocks").insert({
          ...syncFields,
          staff_note: `Imported from ${feed.label}`,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }
      }
    }

    const { data: existingBlocks } = await supabase
      .from("room_blocks")
      .select("id, ical_uid")
      .eq("ical_feed_id", feed.id);

    const staleIds = (existingBlocks ?? [])
      .filter((block) => block.ical_uid && !seenUids.has(block.ical_uid))
      .map((block) => block.id);

    if (staleIds.length > 0) {
      await supabase.from("room_blocks").delete().in("id", staleIds);
    }

    await supabase
      .from("room_ical_feeds")
      .update({
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .eq("id", feed.id);

    return {
      feedId: feed.id,
      label: feed.label,
      ok: true,
      imported: events.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not sync this calendar feed.";

    await supabase
      .from("room_ical_feeds")
      .update({ last_sync_error: message })
      .eq("id", feed.id);

    return {
      feedId: feed.id,
      label: feed.label,
      ok: false,
      imported: 0,
      error: message,
    };
  }
}

/** Deletes channel stays imported from a specific feed (manual closures untouched). */
export async function removeChannelBlocksForFeed(feedId: string): Promise<number> {
  if (!feedId || !hasStaffSupabaseConfig()) {
    return 0;
  }

  const supabase = createStaffSupabaseClient();
  const { data: blocks } = await supabase
    .from("room_blocks")
    .select("id")
    .eq("ical_feed_id", feedId);

  const ids = (blocks ?? []).map((block) => block.id);
  if (ids.length === 0) {
    return 0;
  }

  const { error } = await supabase.from("room_blocks").delete().in("id", ids);
  if (error) {
    throw new Error(error.message);
  }

  return ids.length;
}

/**
 * Removes channel stays for a room type whose feed is gone (removed calendar / broken cascade).
 * Active feed IDs are kept even if their latest sync failed.
 */
export async function removeOrphanedChannelBlocksForRoom(
  roomId: string,
  activeFeedIds: string[],
): Promise<number> {
  if (!roomId || !hasStaffSupabaseConfig()) {
    return 0;
  }

  const supabase = createStaffSupabaseClient();
  const { data: blocks } = await supabase
    .from("room_blocks")
    .select("id, ical_feed_id")
    .eq("room_id", roomId)
    .not("ical_feed_id", "is", null);

  const active = new Set(activeFeedIds);
  const orphanIds = (blocks ?? [])
    .filter((block) => block.ical_feed_id && !active.has(block.ical_feed_id))
    .map((block) => block.id);

  if (orphanIds.length === 0) {
    return 0;
  }

  const { error } = await supabase.from("room_blocks").delete().in("id", orphanIds);
  if (error) {
    throw new Error(error.message);
  }

  return orphanIds.length;
}

async function sweepOrphanedChannelBlocks(feeds: RoomIcalFeed[]) {
  if (!hasStaffSupabaseConfig()) {
    return;
  }

  const activeByRoom = new Map<string, string[]>();
  for (const feed of feeds) {
    const current = activeByRoom.get(feed.roomId) ?? [];
    current.push(feed.id);
    activeByRoom.set(feed.roomId, current);
  }

  const supabase = createStaffSupabaseClient();
  const { data: channelRooms } = await supabase
    .from("room_blocks")
    .select("room_id")
    .not("ical_feed_id", "is", null);

  const roomIds = new Set<string>([
    ...activeByRoom.keys(),
    ...(channelRooms ?? []).map((row) => row.room_id),
  ]);

  for (const roomId of roomIds) {
    await removeOrphanedChannelBlocksForRoom(roomId, activeByRoom.get(roomId) ?? []);
  }
}

export async function syncAllRoomIcalFeeds() {
  const feeds = await getStaffRoomIcalFeeds();
  const results: RoomIcalSyncResult[] = [];

  for (const feed of feeds) {
    results.push(await syncRoomIcalFeed(feed.id));
  }

  await sweepOrphanedChannelBlocks(feeds);

  return results;
}

export async function syncRoomIcalFeedsForRoom(roomId: string): Promise<RoomIcalRoomSyncResult> {
  const feeds = (await getStaffRoomIcalFeeds()).filter((feed) => feed.roomId === roomId);
  const results: RoomIcalSyncResult[] = [];

  for (const feed of feeds) {
    results.push(await syncRoomIcalFeed(feed.id));
  }

  const removedOrphans = await removeOrphanedChannelBlocksForRoom(
    roomId,
    feeds.map((feed) => feed.id),
  );

  return { results, removedOrphans };
}
