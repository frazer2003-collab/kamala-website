# Airbnb iCal export (Kamala)

Status: implemented  
Date: 2026-07-20

## Scope

Airbnb only via free iCal. No Nobeds / Booking.com / Expedia work in this pass.

## Behavior

- Re-enable `/api/ical/unit/[token]` (and room-type `/api/ical/[token]`).
- Per-door export busy when: open website booking assigned to that door (including unconfirmed), door close, or room-type allotment remaining is 0 that night.
- Unassigned open stays only consume type allotment; they do not force every door busy until the type is sold out.
- Do not re-export OTA import blocks (loop avoidance).
- Dedicated staff page for Airbnb import + export URLs; room edit no longer hosts calendar linking.
- Alerts: allotment changes are not instant — refresh inside Airbnb.
- Guest booking stays capacity-strict; staff can save/manage overbooks on the calendar.
