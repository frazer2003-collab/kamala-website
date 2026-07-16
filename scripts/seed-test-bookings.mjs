/**
 * Wipe bookings and seed realistic July–August 2026 test stays.
 * Usage: node scripts/seed-test-bookings.mjs
 * Loads .env.local (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    throw new Error("Missing .env.local");
  }
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function nightsBetween(arrival, departure) {
  const a = new Date(`${arrival}T00:00:00Z`);
  const d = new Date(`${departure}T00:00:00Z`);
  return Math.round((d - a) / 86400000);
}

function depositPaidAt(isoDay, hour = 10) {
  return `${isoDay}T${String(hour).padStart(2, "0")}:15:00.000Z`;
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: rooms, error: roomsError } = await supabase
  .from("rooms")
  .select("id, name, rate")
  .order("sort_order", { ascending: true });

if (roomsError || !rooms?.length) {
  throw new Error(roomsError?.message ?? "No rooms found");
}

const roomById = Object.fromEntries(rooms.map((r) => [r.id, r]));

const { data: unitTypes, error: unitTypesError } = await supabase
  .from("room_unit_types")
  .select("room_unit_id, room_id");

if (unitTypesError) {
  throw new Error(unitTypesError.message);
}

const { data: units, error: unitsError } = await supabase
  .from("room_units")
  .select("id, number")
  .order("sort_order", { ascending: true });

if (unitsError || !units?.length) {
  throw new Error(unitsError?.message ?? "No room units found");
}

const unitNumberById = Object.fromEntries(units.map((u) => [u.id, u.number]));
const unitsByRoom = new Map();
for (const link of unitTypes ?? []) {
  const list = unitsByRoom.get(link.room_id) ?? [];
  list.push(link.room_unit_id);
  unitsByRoom.set(link.room_id, list);
}

function pickUnit(roomId, index) {
  const list = unitsByRoom.get(roomId) ?? [];
  if (!list.length) return null;
  return list[index % list.length];
}

console.log("Wiping booking_messages, booking_requests, and non-iCal room_blocks…");

const { error: wipeMessages } = await supabase
  .from("booking_messages")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (wipeMessages) throw new Error(`messages: ${wipeMessages.message}`);

const { error: wipeBookings } = await supabase
  .from("booking_requests")
  .delete()
  .neq("id", "00000000-0000-0000-0000-000000000000");
if (wipeBookings) throw new Error(`bookings: ${wipeBookings.message}`);

const { error: wipeBlocks } = await supabase
  .from("room_blocks")
  .delete()
  .is("ical_feed_id", null);
if (wipeBlocks) throw new Error(`blocks: ${wipeBlocks.message}`);

/** @type {Array<Record<string, unknown>>} */
const seeds = [
  // —— July past / current (relative to 2026-07-11) ——
  {
    guest_name: "Emma Walsh",
    guest_email: "emma.walsh@example.com",
    guest_phone: "+44 7700 900121",
    room_id: "courtyard",
    arrival_date: "2026-07-03",
    departure_date: "2026-07-06",
    status: "confirmed",
    stay_status: "checked-out",
    note: "Early flight out — asked for 7am taxi.",
    staff_note: "Taxi booked with local driver.",
    deposit: true,
    unitIndex: 0,
    created_offset_days: 20,
  },
  {
    guest_name: "Kenji Sato",
    guest_email: "kenji.sato@example.jp",
    guest_phone: "+81 90 1234 5678",
    room_id: "garden",
    arrival_date: "2026-07-05",
    departure_date: "2026-07-09",
    status: "confirmed",
    stay_status: "checked-out",
    note: "Quiet room if possible.",
    staff_note: null,
    deposit: true,
    unitIndex: 0,
    created_offset_days: 18,
  },
  {
    guest_name: "Sofia Alvarez",
    guest_email: "sofia.alvarez@example.com",
    guest_phone: "+34 612 345 678",
    room_id: "veranda",
    arrival_date: "2026-07-08",
    departure_date: "2026-07-12",
    status: "confirmed",
    stay_status: "checked-in",
    note: "Travelling with sister — two beds preferred.",
    staff_note: "Checked in 3:40pm. Gave city map.",
    deposit: true,
    unitIndex: 0,
    created_offset_days: 14,
  },
  {
    guest_name: "James Okonkwo",
    guest_email: "james.okonkwo@example.com",
    guest_phone: "+1 415 555 0198",
    room_id: "courtyard",
    arrival_date: "2026-07-10",
    departure_date: "2026-07-14",
    status: "confirmed",
    stay_status: "checked-in",
    note: "Arrived late from Bangkok overnight bus.",
    staff_note: "Key left at desk for late arrival — room number still to assign.",
    deposit: true,
    unitIndex: null,
    created_offset_days: 12,
  },
  {
    guest_name: "Priya Nair",
    guest_email: "priya.nair@example.com",
    guest_phone: "+91 98765 43210",
    room_id: "loft",
    arrival_date: "2026-07-09",
    departure_date: "2026-07-13",
    status: "confirmed",
    stay_status: "checked-in",
    note: "Family of four — need extra towels.",
    staff_note: "Extra towels delivered day 1.",
    deposit: true,
    unitIndex: 0,
    created_offset_days: 16,
  },
  // —— Rest of July ——
  {
    guest_name: "Lucas Meyer",
    guest_email: "lucas.meyer@example.de",
    guest_phone: "+49 151 23456789",
    room_id: "garden",
    arrival_date: "2026-07-14",
    departure_date: "2026-07-18",
    status: "confirmed",
    stay_status: "expected",
    note: "Vegetarian breakfast please.",
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 9,
  },
  {
    guest_name: "Chloe Martin",
    guest_email: "chloe.martin@example.fr",
    guest_phone: "+33 6 12 34 56 78",
    room_id: "courtyard",
    arrival_date: "2026-07-15",
    departure_date: "2026-07-17",
    status: "awaiting",
    stay_status: "expected",
    note: "Can we store luggage after checkout until 6pm?",
    staff_note: "Waiting on deposit.",
    deposit: false,
    unitIndex: null,
    created_offset_days: 2,
  },
  {
    guest_name: "Daniel Kim",
    guest_email: "daniel.kim@example.kr",
    guest_phone: "+82 10 9876 5432",
    room_id: "veranda",
    arrival_date: "2026-07-16",
    departure_date: "2026-07-20",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 7,
  },
  {
    guest_name: "Hannah Brooks",
    guest_email: "hannah.brooks@example.com",
    guest_phone: "+61 412 345 678",
    room_id: "courtyard",
    arrival_date: "2026-07-18",
    departure_date: "2026-07-22",
    status: "needs-reply",
    stay_status: "expected",
    note: "Do you have a twin setup for this room?",
    staff_note: "Guest asked about twin beds — reply pending.",
    deposit: true,
    unitIndex: null,
    created_offset_days: 1,
  },
  {
    guest_name: "Marco Rossi",
    guest_email: "marco.rossi@example.it",
    guest_phone: "+39 333 123 4567",
    room_id: "garden",
    arrival_date: "2026-07-20",
    departure_date: "2026-07-25",
    status: "confirmed",
    stay_status: "expected",
    note: "Anniversary trip.",
    staff_note: "Small welcome fruit plate noted.",
    deposit: true,
    unitIndex: null,
    created_offset_days: 5,
  },
  {
    guest_name: "Amy Chen",
    guest_email: "amy.chen@example.com",
    guest_phone: "+65 9123 4567",
    room_id: "loft",
    arrival_date: "2026-07-22",
    departure_date: "2026-07-26",
    status: "pending_payment",
    stay_status: "expected",
    note: "Parents + two teens.",
    staff_note: "Stripe checkout started, not completed.",
    deposit: false,
    unitIndex: null,
    created_offset_days: 0,
  },
  {
    guest_name: "Tom Hughes",
    guest_email: "tom.hughes@example.com",
    guest_phone: "+44 7700 900334",
    room_id: "courtyard",
    arrival_date: "2026-07-24",
    departure_date: "2026-07-27",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 4,
  },
  {
    guest_name: "Yuki Tanaka",
    guest_email: "yuki.tanaka@example.jp",
    guest_phone: "+81 80 5555 1212",
    room_id: "veranda",
    arrival_date: "2026-07-26",
    departure_date: "2026-07-29",
    status: "new",
    stay_status: "expected",
    note: "First time in Chiang Mai.",
    staff_note: null,
    deposit: false,
    unitIndex: null,
    created_offset_days: 0,
  },
  {
    guest_name: "Olivia Grant",
    guest_email: "olivia.grant@example.com",
    guest_phone: "+1 206 555 0144",
    room_id: "garden",
    arrival_date: "2026-07-28",
    departure_date: "2026-08-01",
    status: "confirmed",
    stay_status: "expected",
    note: "Crossing month boundary.",
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 6,
  },
  {
    guest_name: "Noah Patel",
    guest_email: "noah.patel@example.com",
    guest_phone: "+44 7700 900556",
    room_id: "courtyard",
    arrival_date: "2026-07-12",
    departure_date: "2026-07-13",
    status: "declined",
    stay_status: "expected",
    note: "Needed same-day booking — fully booked that night.",
    staff_note: "Declined — no Superior left for 12 Jul.",
    deposit: false,
    unitIndex: null,
    created_offset_days: 1,
  },
  // —— August ——
  {
    guest_name: "Isabella Costa",
    guest_email: "isabella.costa@example.com",
    guest_phone: "+55 11 98765 4321",
    room_id: "garden",
    arrival_date: "2026-08-01",
    departure_date: "2026-08-05",
    status: "confirmed",
    stay_status: "expected",
    note: "Spanish/Portuguese OK.",
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 8,
  },
  {
    guest_name: "Felix Weber",
    guest_email: "felix.weber@example.ch",
    guest_phone: "+41 79 123 45 67",
    room_id: "courtyard",
    arrival_date: "2026-08-02",
    departure_date: "2026-08-06",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 3,
  },
  {
    guest_name: "Mia Johansson",
    guest_email: "mia.johansson@example.se",
    guest_phone: "+46 70 123 45 67",
    room_id: "veranda",
    arrival_date: "2026-08-04",
    departure_date: "2026-08-08",
    status: "awaiting",
    stay_status: "expected",
    note: "Arriving after 9pm — please hold key.",
    staff_note: "Deposit link sent.",
    deposit: false,
    unitIndex: null,
    created_offset_days: 2,
  },
  {
    guest_name: "Ryan Cooper",
    guest_email: "ryan.cooper@example.com",
    guest_phone: "+1 312 555 0188",
    room_id: "loft",
    arrival_date: "2026-08-06",
    departure_date: "2026-08-10",
    status: "confirmed",
    stay_status: "expected",
    note: "Two adults, two kids (8 and 11).",
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 10,
  },
  {
    guest_name: "Aisha Rahman",
    guest_email: "aisha.rahman@example.com",
    guest_phone: "+60 12 345 6789",
    room_id: "courtyard",
    arrival_date: "2026-08-08",
    departure_date: "2026-08-11",
    status: "confirmed",
    stay_status: "expected",
    note: "Halal breakfast options?",
    staff_note: "Noted for kitchen.",
    deposit: true,
    unitIndex: null,
    created_offset_days: 4,
  },
  {
    guest_name: "Benjamin Lee",
    guest_email: "benjamin.lee@example.com",
    guest_phone: "+852 9123 4567",
    room_id: "garden",
    arrival_date: "2026-08-10",
    departure_date: "2026-08-14",
    status: "needs-reply",
    stay_status: "expected",
    note: "Is the balcony facing the garden or the street?",
    staff_note: "Reply with garden balcony photo.",
    deposit: true,
    unitIndex: null,
    created_offset_days: 1,
  },
  {
    guest_name: "Clara Dubois",
    guest_email: "clara.dubois@example.fr",
    guest_phone: "+33 7 89 01 23 45",
    room_id: "veranda",
    arrival_date: "2026-08-12",
    departure_date: "2026-08-16",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 5,
  },
  {
    guest_name: "Ethan Brown",
    guest_email: "ethan.brown@example.com",
    guest_phone: "+1 646 555 0177",
    room_id: "courtyard",
    arrival_date: "2026-08-15",
    departure_date: "2026-08-18",
    status: "confirmed",
    stay_status: "expected",
    note: "Work trip — need desk and strong Wi‑Fi.",
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 7,
  },
  {
    guest_name: "Nadia Petrov",
    guest_email: "nadia.petrov@example.com",
    guest_phone: "+7 916 123 45 67",
    room_id: "garden",
    arrival_date: "2026-08-18",
    departure_date: "2026-08-22",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 6,
  },
  {
    guest_name: "William Scott",
    guest_email: "william.scott@example.com",
    guest_phone: "+44 7700 900778",
    room_id: "loft",
    arrival_date: "2026-08-20",
    departure_date: "2026-08-24",
    status: "awaiting",
    stay_status: "expected",
    note: "Need ground-floor access if possible — one guest has limited stairs.",
    staff_note: "Family room is upstairs — discuss options.",
    deposit: false,
    unitIndex: null,
    created_offset_days: 3,
  },
  {
    guest_name: "Hana Nguyen",
    guest_email: "hana.nguyen@example.com",
    guest_phone: "+84 90 123 4567",
    room_id: "veranda",
    arrival_date: "2026-08-23",
    departure_date: "2026-08-26",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 2,
  },
  {
    guest_name: "Jack Wilson",
    guest_email: "jack.wilson@example.com",
    guest_phone: "+61 400 123 456",
    room_id: "courtyard",
    arrival_date: "2026-08-25",
    departure_date: "2026-08-28",
    status: "new",
    stay_status: "expected",
    note: "Sunday walking street week — excited!",
    staff_note: null,
    deposit: false,
    unitIndex: null,
    created_offset_days: 0,
  },
  {
    guest_name: "Elena Popov",
    guest_email: "elena.popov@example.com",
    guest_phone: "+359 88 123 4567",
    room_id: "garden",
    arrival_date: "2026-08-27",
    departure_date: "2026-08-30",
    status: "confirmed",
    stay_status: "expected",
    note: null,
    staff_note: null,
    deposit: true,
    unitIndex: null,
    created_offset_days: 9,
  },
];


// A couple of staff closed nights for realism
const closedBlocks = [
  {
    room_id: "courtyard",
    start_date: "2026-07-30",
    end_date: "2026-07-31",
    reason: "Maintenance",
    staff_note: "AC service — one Superior offline.",
  },
  {
    room_id: "garden",
    start_date: "2026-08-16",
    end_date: "2026-08-17",
    reason: "Closed",
    staff_note: "Owner use.",
  },
];

const now = Date.now();
const rows = seeds.map((seed) => {
  const room = roomById[seed.room_id];
  if (!room) throw new Error(`Unknown room ${seed.room_id}`);
  const nights = nightsBetween(seed.arrival_date, seed.departure_date);
  const estimated_total = nights * room.rate;
  const deposit_amount = Math.round(estimated_total * 0.5);
  const room_unit_id =
    seed.unitIndex === null || seed.unitIndex === undefined
      ? null
      : pickUnit(seed.room_id, seed.unitIndex);
  const created = new Date(now - seed.created_offset_days * 86400000);

  return {
    guest_name: seed.guest_name,
    guest_email: seed.guest_email,
    guest_phone: seed.guest_phone,
    room_id: seed.room_id,
    room_name: room.name,
    arrival_date: seed.arrival_date,
    departure_date: seed.departure_date,
    nights,
    estimated_total,
    note: seed.note,
    staff_note: seed.staff_note,
    stay_status: seed.stay_status,
    status: seed.status,
    deposit_amount,
    deposit_paid_at: seed.deposit ? depositPaidAt(seed.arrival_date, 9) : null,
    conversation_token: crypto.randomUUID().replace(/-/g, ""),
    room_unit_id,
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
  };
});

const { data: inserted, error: insertError } = await supabase
  .from("booking_requests")
  .insert(rows)
  .select("id, guest_name, arrival_date, status, room_id, room_unit_id");

if (insertError) {
  throw new Error(`insert bookings: ${insertError.message}`);
}

const { error: blockError } = await supabase.from("room_blocks").insert(closedBlocks);
if (blockError) {
  throw new Error(`insert blocks: ${blockError.message}`);
}

// Sample chat on one needs-reply booking
const needsReply = inserted?.find((b) => b.guest_name === "Hannah Brooks");
if (needsReply) {
  await supabase.from("booking_messages").insert([
    {
      booking_request_id: needsReply.id,
      sender: "guest",
      sender_email: "hannah.brooks@example.com",
      body: "Hi — can the Superior be set up as twin beds for my friend and me?",
    },
    {
      booking_request_id: needsReply.id,
      sender: "staff",
      sender_email: null,
      body: "Yes, we can set twin beds. We'll confirm the layout before you arrive.",
    },
  ]);
}

console.log(`Inserted ${inserted?.length ?? 0} bookings and ${closedBlocks.length} closed blocks.`);
for (const b of inserted ?? []) {
  const door = b.room_unit_id ? unitNumberById[b.room_unit_id] ?? "?" : "—";
  console.log(
    `  ${b.arrival_date}  ${b.status.padEnd(16)}  ${b.room_id.padEnd(10)}  #${door}  ${b.guest_name}`,
  );
}

console.log("\nStaff login (local): admin / admin");
console.log("Done.");
