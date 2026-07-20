# Airbnb iCal export (Kamala)

Status: implemented (export API retained; staff UI is import-only as of OTA sections pass)  
Date: 2026-07-20

## Scope

Originally Airbnb two-way iCal. Staff Calendars UI is now **import-only** for Airbnb (per door), Booking.com (per type), and Expedia (per type). See `2026-07-20-ota-ical-import-sections-design.md`.

## Behavior

- `/api/ical/unit/[token]` (and room-type `/api/ical/[token]`) remain available for export if needed later.
- Per-door export busy when: open website booking assigned to that door (including unconfirmed), door close, or room-type allotment remaining is 0 that night.
- Unassigned open stays only consume type allotment; they do not force every door busy until the type is sold out.
- Do not re-export OTA import blocks (loop avoidance).
- Staff Calendars page: import feeds only; room edit no longer hosts calendar linking.
- Guest booking stays capacity-strict; staff can save/manage overbooks on the calendar.
