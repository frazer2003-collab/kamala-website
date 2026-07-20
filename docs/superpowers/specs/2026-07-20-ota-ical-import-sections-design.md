# OTA iCal import sections (Kamala)

Status: approved  
Date: 2026-07-20

## Scope

Staff Settings → Calendars splits into three import-only sections. No Kamala → OTA export UI in this pass (export API may remain for later).

## Sections

1. **Airbnb** — one import feed per **door number** (`room_unit_id` set).
2. **Booking.com** — one import feed per **room type** (`room_id` only, `room_unit_id` null).
3. **Expedia** — one import feed per **room type** (same shape as Booking.com).

## Rules

- Labels identify channel: `Airbnb {door}`, `Booking.com · {type}`, `Expedia · {type}`.
- Reject a second feed of the same channel on the same door (Airbnb) or room type (Booking/Expedia).
- Sync OTA bookings continues to refresh all feeds.
- Channel stays keep feed labels on the staff calendar.
