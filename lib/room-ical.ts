import { bookingOccupiesDay } from "@/lib/calendar";
import { bookingBlocksCalendarExport } from "@/lib/booking-reservation";
import {
  buildIcsCalendar,
  isOtaReservationEvent,
  parseIcsEvents,
  type IcalEvent,
} from "@/lib/ical";
import { type RoomIcalFeed } from "@/lib/ota-ical-channel";
import {
  addIsoDays,
  buildInventoryLookup,
  getRoomDayInventoryForRange,
} from "@/lib/room-day-inventory";
import { getRoomForBooking } from "@/lib/rooms";
import { createStaffSupabaseClient, hasStaffSupabaseConfig, type RoomIcalFeedRow } from "@/lib/supabase";

export type { OtaIcalChannel, RoomIcalFeed } from "@/lib/ota-ical-channel";
export {
  feedMatchesOtaChannel,
  otaChannelFromLabel,
  otaChannelLabel,
} from "@/lib/ota-ical-channel";

export type RoomIcalSyncResult = {
  feedId: string;
  label: string;
  ok: boolean;
  imported: number;
  error?: string;
  /** Soft issue — existing stays were kept (not a hard sync failure). */
  warning?: string;
};

export type RoomIcalRoomSyncResult = {
  results: RoomIcalSyncResult[];
  removedOrphans: number;
};

function mapRoomIcalFeed(row: RoomIcalFeedRow): RoomIcalFeed {
  return {
    id: row.id,
    roomId: row.room_id,
    roomUnitId: row.room_unit_id ?? null,
    label: row.label,
    importUrl: row.import_url,
    lastSyncedAt: row.last_synced_at,
    lastSyncError: row.last_sync_error,
  };
}

const OTA_ICAL_HOST_ALLOWLIST = [
  /(^|\.)airbnb\.(com|co\.[a-z]{2})$/i,
  /(^|\.)booking\.com$/i,
  /(^|\.)expedia\.[a-z.]+$/i,
  /(^|\.)ical\.booking\.com$/i,
  // Nobeds channel-manager booking exports (often wrap Booking/Expedia inventory).
  /(^|\.)nobeds\.app$/i,
];

function isPrivateOrLocalHostname(hostname: string) {
  const host = hostname.trim().toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }

  return false;
}

/** HTTPS OTA calendar URLs only (Airbnb / Booking.com / Expedia / Nobeds hosts). */
export function isValidIcalImportUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return false;
    }
    if (isPrivateOrLocalHostname(url.hostname)) {
      return false;
    }
    return OTA_ICAL_HOST_ALLOWLIST.some((pattern) => pattern.test(url.hostname));
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

    if (error) {
      if (/room_unit_id|column .* does not exist/i.test(error.message)) {
        const legacy = await supabase
          .from("room_ical_feeds")
          .select(
            "id, room_id, label, import_url, last_synced_at, last_sync_error, created_at",
          )
          .order("created_at", { ascending: true });
        if (legacy.error || !legacy.data) {
          return [];
        }
        return legacy.data.map((row) =>
          mapRoomIcalFeed({ ...row, room_unit_id: null }),
        );
      }
      return [];
    }

    if (!data) {
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

export async function getRoomUnitByIcalExportToken(token: string) {
  if (!token || !hasStaffSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = createStaffSupabaseClient();
    const { data, error } = await supabase
      .from("room_units")
      .select("id, number, ical_export_token")
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

const ICAL_EXPORT_HORIZON_DAYS = 540;

function todayIsoLocal() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Merge sorted night ISOs into DTEND-exclusive busy events. */
export function mergeBusyNightsToEvents(
  nights: string[],
  uidPrefix: string,
  summary: string,
): IcalEvent[] {
  if (nights.length === 0) {
    return [];
  }

  const sorted = [...new Set(nights)].sort();
  const events: IcalEvent[] = [];
  let rangeStart = sorted[0];
  let rangeEnd = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const night = sorted[index];
    if (night === addIsoDays(rangeEnd, 1)) {
      rangeEnd = night;
      continue;
    }

    events.push({
      uid: `${uidPrefix}-${rangeStart}`,
      summary,
      startDate: rangeStart,
      endDate: addIsoDays(rangeEnd, 1),
    });
    rangeStart = night;
    rangeEnd = night;
  }

  events.push({
    uid: `${uidPrefix}-${rangeStart}`,
    summary,
    startDate: rangeStart,
    endDate: addIsoDays(rangeEnd, 1),
  });

  return events;
}

async function getTypeSoldOutNights(
  roomId: string,
  availableCount: number,
  rangeStart: string,
  rangeEndExclusive: string,
): Promise<Set<string>> {
  const supabase = createStaffSupabaseClient();
  const [{ data: bookings }, blocksResult, inventoryEntries] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, arrival_date, departure_date, status")
      .eq("room_id", roomId)
      .lt("arrival_date", rangeEndExclusive)
      .gt("departure_date", rangeStart),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, ical_feed_id")
      .eq("room_id", roomId)
      .lt("start_date", rangeEndExclusive)
      .gt("end_date", rangeStart),
    getRoomDayInventoryForRange(roomId, rangeStart, rangeEndExclusive),
  ]);

  const blocks = blocksResult.error ? [] : (blocksResult.data ?? []);
  const inventoryLookup = buildInventoryLookup(inventoryEntries);
  const soldOut = new Set<string>();
  const cursor = new Date(`${rangeStart}T00:00:00`);
  const end = new Date(`${rangeEndExclusive}T00:00:00`);

  while (cursor < end) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    let netBooked = 0;
    let closed = false;

    for (const block of blocks) {
      if (
        !bookingOccupiesDay(
          { arrivalDate: block.start_date, departureDate: block.end_date },
          iso,
        )
      ) {
        continue;
      }

      if (!block.ical_feed_id) {
        closed = true;
        break;
      }

      netBooked += 1;
    }

    if (!closed) {
      for (const booking of bookings ?? []) {
        if (!bookingBlocksCalendarExport(booking)) {
          continue;
        }

        if (
          bookingOccupiesDay(
            {
              arrivalDate: booking.arrival_date,
              departureDate: booking.departure_date,
            },
            iso,
          )
        ) {
          netBooked += 1;
        }
      }
    }

    const roomsToSell = inventoryLookup.get(`${roomId}:${iso}`) ?? availableCount;
    if (closed || netBooked >= roomsToSell) {
      soldOut.add(iso);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return soldOut;
}

/**
 * Room-type export: open website stays on the type + type-level manual closures.
 * Does not re-export channel/Airbnb imports (loop avoidance).
 */
export async function getRoomIcalExportEvents(roomId: string): Promise<IcalEvent[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id, guest_name, arrival_date, departure_date, status")
      .eq("room_id", roomId)
      .neq("status", "declined")
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
    if (!bookingBlocksCalendarExport(booking)) {
      continue;
    }

    events.push({
      uid: `kamala-booking-${booking.id}`,
      summary: "Reserved",
      startDate: booking.arrival_date,
      endDate: booking.departure_date,
    });
  }

  for (const block of blocks ?? []) {
    events.push({
      uid: `kamala-block-${block.id}`,
      summary: "Closed",
      startDate: block.start_date,
      endDate: block.end_date,
    });
  }

  return events;
}

/**
 * Per room-number Airbnb export:
 * - open website stays assigned to this door
 * - manual closes on this door
 * - nights when the linked room type is sold out (allotment reached)
 * OTA imports are not re-exported (avoids loops).
 */
export async function getRoomUnitIcalExportEvents(unitId: string): Promise<IcalEvent[]> {
  if (!hasStaffSupabaseConfig()) {
    return [];
  }

  const supabase = createStaffSupabaseClient();
  const [{ data: unitTypeRows }, { data: bookings }, { data: blocks }] = await Promise.all([
    supabase.from("room_unit_types").select("room_id").eq("room_unit_id", unitId),
    supabase
      .from("booking_requests")
      .select("id, guest_name, arrival_date, departure_date, status")
      .eq("room_unit_id", unitId)
      .neq("status", "declined")
      .order("arrival_date", { ascending: true }),
    supabase
      .from("room_blocks")
      .select("id, start_date, end_date, reason")
      .eq("room_unit_id", unitId)
      .is("ical_feed_id", null)
      .order("start_date", { ascending: true }),
  ]);

  const events: IcalEvent[] = [];
  const coveredNights = new Set<string>();

  for (const booking of bookings ?? []) {
    if (!bookingBlocksCalendarExport(booking)) {
      continue;
    }

    events.push({
      uid: `kamala-booking-${booking.id}`,
      summary: "Reserved",
      startDate: booking.arrival_date,
      endDate: booking.departure_date,
    });

    let cursor = booking.arrival_date;
    while (cursor < booking.departure_date) {
      coveredNights.add(cursor);
      cursor = addIsoDays(cursor, 1);
    }
  }

  for (const block of blocks ?? []) {
    events.push({
      uid: `kamala-block-${block.id}`,
      summary: "Closed",
      startDate: block.start_date,
      endDate: block.end_date,
    });

    let cursor = block.start_date;
    while (cursor < block.end_date) {
      coveredNights.add(cursor);
      cursor = addIsoDays(cursor, 1);
    }
  }

  const rangeStart = todayIsoLocal();
  const rangeEndExclusive = addIsoDays(rangeStart, ICAL_EXPORT_HORIZON_DAYS);
  const soldOutNights = new Set<string>();

  for (const row of unitTypeRows ?? []) {
    const room = await getRoomForBooking(row.room_id);
    if (!room) {
      continue;
    }

    const nights = await getTypeSoldOutNights(
      row.room_id,
      room.availableCount,
      rangeStart,
      rangeEndExclusive,
    );
    for (const night of nights) {
      soldOutNights.add(night);
    }
  }

  const extraSoldOut = [...soldOutNights].filter((night) => !coveredNights.has(night));
  events.push(
    ...mergeBusyNightsToEvents(extraSoldOut, `kamala-soldout-${unitId}`, "Unavailable"),
  );

  return events;
}

export async function buildRoomIcalExport(roomId: string, calendarName: string) {
  const events = await getRoomIcalExportEvents(roomId);
  return buildIcsCalendar(events, calendarName);
}

export async function buildRoomUnitIcalExport(unitId: string, calendarName: string) {
  const events = await getRoomUnitIcalExportEvents(unitId);
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

type PreservedChannelFields = {
  room_unit_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  staff_note: string | null;
};

type PreviousChannelBlockRow = {
  room_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  ical_feed_id: string | null;
  ical_uid: string | null;
  room_unit_id: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  staff_note: string | null;
};

/**
 * Full refresh for one feed: fetch ICS, then replace every imported stay for
 * that feed. Staff room # / guest details are kept when the same UID returns
 * and the stay is still on this feed's room type. Unit-linked feeds default
 * new stays to that room number. Stays always re-import onto the feed's room
 * type (staff type moves are overwritten by sync).
 */
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

  let previousSnapshot: PreviousChannelBlockRow[] = [];
  let didDelete = false;

  try {
    const icsText = await fetchIcalFeedText(feed.import_url);
    if (!icsText.trim()) {
      throw new Error("Calendar feed was empty.");
    }

    const parsedEvents = parseIcsEvents(icsText).filter(isOtaReservationEvent);
    // Airbnb occasionally repeats UIDs; one bad batch must not fail the whole feed.
    const eventsByUid = new Map<string, (typeof parsedEvents)[number]>();
    for (const event of parsedEvents) {
      eventsByUid.set(event.uid, event);
    }
    const events = [...eventsByUid.values()];

    const { data: previousBlocks, error: previousError } = await supabase
      .from("room_blocks")
      .select(
        "room_id, start_date, end_date, reason, ical_feed_id, ical_uid, room_unit_id, guest_name, guest_email, guest_phone, staff_note",
      )
      .eq("ical_feed_id", feed.id);

    if (previousError) {
      throw new Error(previousError.message);
    }

    previousSnapshot = previousBlocks ?? [];

    // Never wipe a populated feed when the fetch/parse produced zero stays —
    // Airbnb glitches / partial responses would otherwise erase the calendar.
    if (events.length === 0 && previousSnapshot.length > 0) {
      await supabase
        .from("room_ical_feeds")
        .update({
          last_synced_at: new Date().toISOString(),
          last_sync_error: "Feed returned no reservations; kept existing stays.",
        })
        .eq("id", feed.id);

      return {
        feedId: feed.id,
        label: feed.label,
        ok: true,
        imported: previousSnapshot.length,
        warning: "Feed returned no reservations; kept existing stays.",
      };
    }

    const preservedByUid = new Map<string, PreservedChannelFields>();
    for (const block of previousSnapshot) {
      if (!block.ical_uid) {
        continue;
      }
      preservedByUid.set(block.ical_uid, {
        // Door comes from the feed for Airbnb unit links; only keep guest fields.
        room_unit_id: null,
        guest_name: block.guest_name ?? null,
        guest_email: block.guest_email ?? null,
        guest_phone: block.guest_phone ?? null,
        staff_note: block.staff_note ?? null,
      });
    }

    const { error: deleteError } = await supabase
      .from("room_blocks")
      .delete()
      .eq("ical_feed_id", feed.id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }
    didDelete = true;

    const defaultUnitId = feed.room_unit_id ?? null;

    if (events.length > 0) {
      const rows = events.map((event) => {
        const preserved = preservedByUid.get(event.uid);
        return {
          room_id: feed.room_id,
          start_date: event.startDate,
          end_date: event.endDate,
          reason: event.summary || feed.label,
          ical_feed_id: feed.id,
          ical_uid: event.uid,
          // Always pin Airbnb door feeds back to the linked room number.
          room_unit_id: defaultUnitId,
          guest_name: preserved?.guest_name ?? null,
          guest_email: preserved?.guest_email ?? null,
          guest_phone: preserved?.guest_phone ?? null,
          staff_note: preserved?.staff_note ?? `Imported from ${feed.label}`,
        };
      });

      const { error: insertError } = await supabase.from("room_blocks").insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }
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
    let message =
      error instanceof Error ? error.message : "Could not sync this calendar feed.";

    if (didDelete && previousSnapshot.length > 0) {
      const { error: restoreError } = await supabase
        .from("room_blocks")
        .insert(previousSnapshot);
      if (restoreError) {
        message = `${message} Restore also failed: ${restoreError.message}`;
      }
    }

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
 * Removes channel stays whose feed no longer exists anywhere (removed calendar).
 * Uses the global active feed list — not per room type — so a stay staff moved
 * to another type is not treated as an orphan of that type.
 */
export async function removeOrphanedChannelBlocks(
  activeFeedIds: string[],
): Promise<number> {
  if (!hasStaffSupabaseConfig()) {
    return 0;
  }

  const supabase = createStaffSupabaseClient();
  const { data: blocks } = await supabase
    .from("room_blocks")
    .select("id, ical_feed_id")
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

/** @deprecated Prefer removeOrphanedChannelBlocks — per-room active feeds wrongly drop moved stays. */
export async function removeOrphanedChannelBlocksForRoom(
  roomId: string,
  activeFeedIds: string[],
): Promise<number> {
  if (!roomId || !hasStaffSupabaseConfig()) {
    return 0;
  }

  // Still scoped to the room for callers that only sync one type, but orphans
  // are only IDs missing from the provided active list (pass global IDs).
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

export async function syncAllRoomIcalFeeds() {
  const feeds = await getStaffRoomIcalFeeds();
  const results: RoomIcalSyncResult[] = [];

  for (const feed of feeds) {
    results.push(await syncRoomIcalFeed(feed.id));
  }

  await removeOrphanedChannelBlocks(feeds.map((feed) => feed.id));

  return results;
}

/** Full refresh of every OTA feed on a room type, then drop truly removed feeds. */
export async function syncRoomIcalFeedsForRoom(roomId: string): Promise<RoomIcalRoomSyncResult> {
  const allFeeds = await getStaffRoomIcalFeeds();
  const feeds = allFeeds.filter((feed) => feed.roomId === roomId);
  const results: RoomIcalSyncResult[] = [];

  for (const feed of feeds) {
    results.push(await syncRoomIcalFeed(feed.id));
  }

  // Pass every active feed id so a stay moved onto this type from another
  // Airbnb door is not deleted as an "orphan".
  const removedOrphans = await removeOrphanedChannelBlocksForRoom(
    roomId,
    allFeeds.map((feed) => feed.id),
  );

  return { results, removedOrphans };
}
