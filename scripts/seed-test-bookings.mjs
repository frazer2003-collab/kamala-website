import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function nightsBetween(arrival, departure) {
  const start = new Date(`${arrival}T00:00:00`);
  const end = new Date(`${departure}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const today = new Date();
const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

const testBookings = [
  {
    guest_name: "Sarah Chen",
    guest_email: "sarah.chen@example.com",
    guest_phone: "+66 81 234 5601",
    room_id: "courtyard",
    arrival_offset: 2,
    nights: 1,
    status: "confirmed",
    stay_status: "expected",
    note: "One-night stay to test compact calendar labels.",
    staff_note: "Test booking — single night.",
  },
  {
    guest_name: "James Miller",
    guest_email: "james.miller@example.com",
    guest_phone: "+44 7700 900123",
    room_id: "courtyard",
    arrival_offset: 4,
    nights: 3,
    status: "confirmed",
    stay_status: "expected",
    note: "Arriving afternoon. Quiet room if possible.",
    staff_note: null,
  },
  {
    guest_name: "Emma Wilson",
    guest_email: "emma.wilson@example.com",
    guest_phone: "+61 412 345 678",
    room_id: "courtyard",
    arrival_offset: 4,
    nights: 2,
    status: "confirmed",
    stay_status: "checked-in",
    note: "Second unit booked — tests rooms-left on a 2-room type.",
    staff_note: "Overlaps James Miller on first two nights.",
  },
  {
    guest_name: "Marco Rossi",
    guest_email: "marco.rossi@example.com",
    guest_phone: "+39 347 123 4567",
    room_id: "garden",
    arrival_offset: 1,
    nights: 3,
    status: "confirmed",
    stay_status: "checked-in",
    note: "Currently in-house guest.",
    staff_note: "Deluxe balcony room.",
  },
  {
    guest_name: "Lisa Park",
    guest_email: "lisa.park@example.com",
    guest_phone: "+82 10 1234 5678",
    room_id: "veranda",
    arrival_offset: 7,
    nights: 3,
    status: "confirmed",
    stay_status: "expected",
    note: "Travelling with two friends.",
    staff_note: null,
  },
  {
    guest_name: "Tom Davies",
    guest_email: "walk-in@kamala.local",
    guest_phone: "+66 89 876 5432",
    room_id: "garden",
    arrival_offset: 12,
    nights: 1,
    status: "confirmed",
    stay_status: "checked-in",
    note: "Walk-in booking",
    staff_note: "Paid cash at front desk. No email on file.",
  },
  {
    guest_name: "Nina Berg",
    guest_email: "nina.berg@example.com",
    guest_phone: "+47 900 12 345",
    room_id: "veranda",
    arrival_offset: 18,
    nights: 2,
    status: "new",
    stay_status: "expected",
    note: "New website request — should appear on staff requests, not calendar.",
    staff_note: null,
  },
  {
    guest_name: "Alex Turner",
    guest_email: "alex.turner@example.com",
    guest_phone: "+1 555 010 8822",
    room_id: "courtyard",
    arrival_offset: 24,
    nights: 2,
    status: "awaiting",
    stay_status: "expected",
    note: "Deposit paid online — reserved on calendar.",
    staff_note: null,
    deposit_paid: true,
  },
];

// Simulated OTA iCal imports — each block occupies one unit (like a real sync).
// Designed to overlap direct bookings and push rooms-left / sold-out edge cases.
const otaFeeds = [
  {
    label: "Airbnb",
    room_id: "courtyard",
    import_url: "https://example.test/ical/airbnb-superior.ics",
    blocks: [
      {
        uid: "airbnb-superior-jul10",
        arrival_offset: 2,
        nights: 1,
        reason: "Airbnb — Reserved",
        note: "STRESS: Superior Jul 10 — Sarah Chen (direct) + this = 0 left (2/2).",
      },
      {
        uid: "airbnb-superior-jul12",
        arrival_offset: 4,
        nights: 2,
        reason: "Airbnb — Not available",
        note: "STRESS: Superior Jul 12–13 — James + Emma (direct) + this = 3 on 2 units (overbooked).",
      },
      {
        uid: "airbnb-superior-jul16",
        arrival_offset: 8,
        nights: 1,
        reason: "Airbnb — Reserved",
        note: "Superior Jul 16 — clean gap night, 1 unit taken.",
      },
    ],
  },
  {
    label: "Booking.com",
    room_id: "garden",
    import_url: "https://example.test/ical/booking-deluxe.ics",
    blocks: [
      {
        uid: "booking-deluxe-jul10",
        arrival_offset: 2,
        nights: 2,
        reason: "Booking.com — Closed",
        note: "STRESS: Deluxe Jul 10–11 — overlaps Marco (Jul 9–12). 1-unit room double-booked.",
      },
      {
        uid: "booking-deluxe-jul20",
        arrival_offset: 12,
        nights: 1,
        reason: "Booking.com — Not available",
        note: "STRESS: Deluxe Jul 20 — Tom Davies (walk-in) + this = double-booked.",
      },
      {
        uid: "booking-deluxe-jul22",
        arrival_offset: 14,
        nights: 3,
        reason: "Booking.com — Reserved",
        note: "Deluxe Jul 22–24 — solo OTA block, room sold out.",
      },
    ],
  },
  {
    label: "Expedia",
    room_id: "veranda",
    import_url: "https://example.test/ical/expedia-triple.ics",
    blocks: [
      {
        uid: "expedia-triple-jul15",
        arrival_offset: 7,
        nights: 3,
        reason: "Expedia — Reserved",
        note: "STRESS: Triple Jul 15–17 — Lisa Park (direct) + this = 0 left (2/2).",
      },
      {
        uid: "expedia-triple-jul18",
        arrival_offset: 10,
        nights: 1,
        reason: "Expedia — Not available",
        note: "Triple Jul 18 — 1 unit, Lisa still in-house until Jul 18 dep = tight turnover.",
      },
      {
        uid: "expedia-triple-jul25",
        arrival_offset: 17,
        nights: 2,
        reason: "Expedia — Reserved",
        note: "Triple Jul 25–26 — gap before Nina Berg request (Jul 26).",
      },
      {
        uid: "expedia-triple-aug02",
        arrival_offset: 25,
        nights: 2,
        reason: "Expedia — Reserved",
        note: "STRESS: Triple Aug 2–3 — overlaps Alex Turner on Superior only; clean Triple block in August.",
      },
    ],
  },
];

async function wipeIcalData() {
  console.log("Wiping iCal-imported blocks...");
  const { error: blocksError } = await supabase
    .from("room_blocks")
    .delete()
    .not("ical_feed_id", "is", null);

  if (blocksError && !blocksError.message.includes("ical_feed_id")) {
    console.warn("Could not wipe iCal blocks:", blocksError.message);
  }

  console.log("Wiping OTA calendar feeds...");
  const { error: feedsError } = await supabase
    .from("room_ical_feeds")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (feedsError) {
    if (feedsError.code === "42P01") {
      console.warn(
        "room_ical_feeds table missing — run supabase/migrate-room-ical.sql first. Skipping OTA seed.",
      );
      return false;
    }
    console.error("Failed to wipe room_ical_feeds:", feedsError.message);
    process.exit(1);
  }

  return true;
}

async function seedOtaStressTest(roomById) {
  const icalReady = await wipeIcalData();
  if (!icalReady) {
    return;
  }

  console.log("\nSeeding OTA stress-test feeds and blocks...\n");

  for (const feed of otaFeeds) {
    const room = roomById.get(feed.room_id);
    if (!room) {
      console.warn(`Skipping OTA feed for unknown room: ${feed.room_id}`);
      continue;
    }

    const { data: feedRow, error: feedError } = await supabase
      .from("room_ical_feeds")
      .insert({
        room_id: feed.room_id,
        label: feed.label,
        import_url: feed.import_url,
        last_synced_at: new Date().toISOString(),
        last_sync_error: null,
      })
      .select("id, label")
      .single();

    if (feedError || !feedRow) {
      console.error(`Failed to create ${feed.label} feed:`, feedError?.message);
      process.exit(1);
    }

    const blockRows = feed.blocks.map((block) => {
      const start_date = addDays(todayIso, block.arrival_offset);
      const end_date = addDays(start_date, block.nights);
      return {
        room_id: feed.room_id,
        start_date,
        end_date,
        reason: block.reason,
        staff_note: block.note,
        ical_feed_id: feedRow.id,
        ical_uid: block.uid,
      };
    });

    const { error: blockError } = await supabase.from("room_blocks").insert(blockRows);

    if (blockError) {
      console.error(`Failed to insert ${feed.label} blocks:`, blockError.message);
      if (blockError.message.includes("ical_feed_id")) {
        console.error("Run supabase/migrate-room-ical.sql in Supabase, then re-run this script.");
      }
      process.exit(1);
    }

    console.log(`  ${feed.label} → ${room.name} (${blockRows.length} blocks)`);
    for (const block of blockRows) {
      console.log(`    • ${block.start_date} → ${block.end_date} — ${block.reason}`);
    }
  }
}

function printStressTestGuide() {
  console.log(`
Stress-test cheat sheet (today = ${todayIso}):

  SUPERIOR (2 units) — /staff/calendar July
    Jul 10: Sarah (direct) + Airbnb → 0 left
    Jul 12–13: James + Emma (direct) + Airbnb → overbooked (3 on 2)
    Jul 16: Airbnb only → 1 left

  DELUXE (1 unit) — July
    Jul 10–11: Marco (direct) + Booking.com → double-booked
    Jul 20: Tom (walk-in) + Booking.com → double-booked
    Jul 22–24: Booking.com only → sold out

  TRIPLE (2 units) — July / August
    Jul 15–17: Lisa (direct) + Expedia → 0 left
    Jul 25–26: Expedia only
    Aug 2–3: Expedia block (check August on calendar)

  Settings → Rooms: Airbnb / Booking.com / Expedia feeds appear under Import calendars.
`);
}

async function main() {
  console.log("Loading rooms...");
  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name, rate, available_count");

  if (roomsError || !rooms?.length) {
    console.error("Could not load rooms:", roomsError?.message ?? "no rows");
    process.exit(1);
  }

  const roomById = new Map(rooms.map((room) => [room.id, room]));

  console.log("Wiping booking messages...");
  const { error: messagesError } = await supabase
    .from("booking_messages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (messagesError) {
    console.error("Failed to wipe booking_messages:", messagesError.message);
    process.exit(1);
  }

  console.log("Wiping bookings...");
  const { error: bookingsError } = await supabase
    .from("booking_requests")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (bookingsError) {
    console.error("Failed to wipe booking_requests:", bookingsError.message);
    process.exit(1);
  }

  await wipeIcalData();

  const rows = [];

  for (const booking of testBookings) {
    const room = roomById.get(booking.room_id);
    if (!room) {
      console.warn(`Skipping unknown room_id: ${booking.room_id}`);
      continue;
    }

    const arrival_date = addDays(todayIso, booking.arrival_offset);
    const departure_date = addDays(arrival_date, booking.nights);
    const nights = nightsBetween(arrival_date, departure_date);
    const estimated_total = room.rate * nights;
    const deposit_amount = Math.round(estimated_total * 0.5);

    rows.push({
      guest_name: booking.guest_name,
      guest_email: booking.guest_email,
      guest_phone: booking.guest_phone,
      room_id: room.id,
      room_name: room.name,
      arrival_date,
      departure_date,
      nights,
      estimated_total,
      deposit_amount,
      deposit_paid_at: booking.deposit_paid ? new Date().toISOString() : null,
      note: booking.note,
      staff_note: booking.staff_note,
      status: booking.status,
      stay_status: booking.stay_status,
      conversation_token: randomUUID(),
    });
  }

  console.log(`Inserting ${rows.length} test bookings (today = ${todayIso})...`);
  const { data: inserted, error: insertError } = await supabase
    .from("booking_requests")
    .insert(rows)
    .select("id, guest_name, room_name, arrival_date, departure_date, status, stay_status");

  if (insertError) {
    console.error("Failed to insert test bookings:", insertError.message);
    process.exit(1);
  }

  console.log("\nDirect test bookings:\n");
  for (const row of inserted ?? []) {
    console.log(
      `  • ${row.guest_name} — ${row.room_name} — ${row.arrival_date} → ${row.departure_date} — ${row.status} (${row.stay_status})`,
    );
  }

  await seedOtaStressTest(roomById);
  printStressTestGuide();
  console.log("Done. Open /staff/calendar — July 2026 for most scenarios, August for Expedia Aug 2–3.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
