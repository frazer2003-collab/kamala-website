# Nobeds calendar overhaul (paid API) + Airbnb iCal

Status: deferred — Airbnb iCal-only implementation preferred for now  
Date: 2026-07-20

## Goal

Make **Nobeds** the inventory brain for Booking.com and Expedia (paid channel manager / API), keep **Airbnb on free per-door iCal**, and drive the Kamala staff calendar + guest availability from Nobeds so all channels share the same room-type allotments.

## Decisions

| Topic | Choice |
|---|---|
| Booking.com / Expedia | Via **paid Nobeds** (API channel manager) |
| Airbnb | Stay on **iCal**, linked **by door number** (117, 119, 112, …) |
| Mapping | Door listings and type listings all map into the **same room-type pools** (Deluxe / Triple / Superior / Family) |
| Kamala role | Custom brand site + staff UI; **reads/writes inventory and stays through Nobeds API** (not a second independent allotment brain) |
| Free iCal-only bridge to Nobeds | Out of scope for this overhaul (superseded by paid API) |
| Double bookings | Avoid as hard as possible; if one lands, staff can still see and manage it on the calendar |

## Inventory model

Shared pools (examples; align with live `rooms` / door map):

| Room type (Kamala id) | Allotment | Airbnb (iCal by door) | Booking.com / Expedia (in Nobeds) |
|---|---|---|---|
| Deluxe (`garden`) | 2 | 117, 119 | One Deluxe room type |
| Triple (`veranda`) | 1 | 112 | One Triple room type |
| Superior (`courtyard`) | 4 | 113, 115, 118, 120 | One Superior room type |
| Family (`loft`) | 1 | 114 (if listed) | One Family room type |

Rules:

- One sale anywhere (website, Booking, Expedia, Airbnb door) decrements the **type** pool for those nights.
- Unassigned open stays count toward the type pool; they do **not** block every door until the type allotment is full.
- Airbnb door feeds only show a door busy when that door is assigned, closed for that door, or the **type is sold out** that night.

## System topology

```text
Booking.com ──API──┐
Expedia     ──API──┼──► Nobeds (source of truth for inventory + OTA stays)
Airbnb doors ─iCal─┘         ▲
                             │ paid Nobeds API
                             ▼
                    Kamala website + staff calendar
                    (guest book, bank/Stripe, brand UI)
```

Preferred Airbnb wiring (keeps one brain):

1. In Nobeds: map each Airbnb listing to the correct door / type pool.  
2. Airbnb ↔ Nobeds via **iCal** (import + export per door) — no Airbnb API required.  
3. Kamala does **not** need a second Airbnb iCal link if Nobeds already owns those feeds.

Optional later: Kamala can still show copy-only “Airbnb is managed in Nobeds” help on the OTA page.

## Kamala behavior after overhaul

### Guest site

- Availability and quotes for bookable nights come from **Nobeds availability** (cached briefly if needed for performance).
- Creating a booking: create/hold the stay in **Nobeds** via API, then keep Kamala `booking_requests` (or equivalent) for payments, inbox, guest chat, and brand flows.
- Guest path stays **capacity-strict** (no intentional oversell on the website).

### Staff calendar

- Timeline shows Nobeds reservations + Kamala-origin stays in one view (mapped to room types / doors).
- Staff can change room type, assign doors, edit dates, cancel — changes push to Nobeds when they affect inventory.
- Overbooks that slip through must remain visible and editable (avoid first; survive if needed).

### OTA calendars page (new)

Dedicated simple page (e.g. `/staff/settings/calendars` or `/staff/calendars`):

- Status of Nobeds connection (API token configured / last sync / errors).
- Guidance: Booking.com & Expedia are managed in Nobeds; Airbnb stays on iCal by door.
- Short alerts:
  - Connect Airbnb iCal only after Booking/Expedia are live in Nobeds so allotments are accurate.
  - iCal allotment changes are **not instant** — refresh/pull inside Airbnb.
- Room details stay on the rooms settings page; this page is calendars only.

## Avoid vs allow double bookings

**Avoid**

- Nobeds API for Booking/Expedia (near real-time).
- Website capacity checks against Nobeds availability before confirming a hold.
- Correct pooled mapping for Airbnb doors into type allotments.

**Allow / survive**

- OTA or iCal lag may still create an overbook.
- Imports and staff tools must not drop or hide the extra stay.
- Staff calendar remains the place to reassign, upgrade, or cancel.

## Busy nights (Airbnb iCal / export semantics)

Whether Kamala or Nobeds hosts the Airbnb iCal export, busy logic must match:

- Door assigned stay, or
- Door-specific close, or
- Type allotment remaining = 0 for that night  
  (counting open website holds, Nobeds/OTA stays, and inventory-consuming closes)

Open unassigned stays on the type only consume pool count; they do not force every door closed until the pool is full.

## Out of scope (this overhaul)

- Replacing Kamala guest UX with the Nobeds booking-engine iframe as the primary book flow (optional later).
- Building a direct Booking.com / Expedia Connectivity integration inside Kamala (use Nobeds).
- Paying for Airbnb’s API connection if iCal-through-Nobeds is enough.
- Free-tier Nobeds API (subscriber/API token required).

## Implementation sketch (later plan)

1. Nobeds account: connect Booking.com + Expedia; map room types; set type allotments.  
2. Airbnb: per-door iCal import/export on Nobeds listings mapped to those types.  
3. Kamala: store Nobeds API token (staff settings, server-only); client for Availability / Bookings / webhooks.  
4. Refactor staff calendar + guest `hasCapacity` / quote paths to use Nobeds availability.  
5. On website booking paid/claimed/confirmed: create or confirm booking in Nobeds; on cancel: release in Nobeds.  
6. New OTA calendars staff page; strip calendar linking from room detail edit.  
7. Webhook (or poll) so Nobeds → Kamala calendar updates without manual sync.

## Risks

- **Paid dependency:** without an active Nobeds API subscription, the overhaul cannot run.  
- **Two systems during migration:** map IDs carefully (Kamala `room_id` ↔ Nobeds listing/room ids).  
- **iCal lag on Airbnb only:** Booking/Expedia improve; Airbnb remains pull-based.  
- **Payments stay in Kamala:** Stripe/bank flows remain; Nobeds holds inventory/reservation state.

## Success criteria

- Booking.com / Expedia stays appear on the Kamala staff calendar via Nobeds.  
- Website booking reduces Nobeds availability for that type.  
- Airbnb door listings share the same type pool (117 + 119 = Deluxe allotment 2).  
- Staff can manage rare overbooks on the calendar.  
- OTA linking UI lives on a simple dedicated page, not buried in room details.
