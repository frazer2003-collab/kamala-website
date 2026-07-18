# Staff change room type (complimentary move)

Status: approved  
Date: 2026-07-18

## Goal

Staff can move a stay to a different room type (upgrade, lateral, or downgrade) without changing what the guest paid. Used for complimentary upgrades and operational moves.

## Decisions

| Topic | Choice |
|---|---|
| Price | Keep booked stay total and payment fields as-is (full amount on booking; no re-quote, no deposit math) |
| Direction | Any catalog room type |
| Capacity | New type must have free allotment for the stay nights, checked like a normal new booking |
| Door number | Always clear `room_unit_id` when room type changes; staff reassign separately |
| Scope | Calendar direct bookings, channel/OTA stays, and inbox pending requests |

## Behavior

1. Staff choose a new **Room type** on the stay edit UI and save.
2. Server validates the target `room_id` exists in the catalog.
3. Server checks capacity on the **new** type for every night of the stay (using the arrival/departure being saved), with the same rules as placing a normal booking. Do not pass exclude-self for this check.
4. On success:
   - Update `room_id` and denormalized `room_name` (channel stays: `room_blocks.room_id` / name fields as today).
   - Set `room_unit_id` to `null`.
   - Leave `estimated_total`, payment amounts, and payment status unchanged.
5. Same type selected → no type-change side effects (other edited fields may still save).
6. Capacity or validation failure → clear error; no partial type/unit update.

## UI

Add a **Room type** select on:

- Calendar booking panel (`calendar-booking-panel`)
- Channel stay panel (`calendar-block-panel` / channel edit path)
- Inbox request detail (`staff-request-decision-panel` or shared staff edit path)

Helper copy under the field:

> Changing room type keeps the booked price. Room number is cleared.

Door number / unit controls remain separate and are empty after a type change until staff assign again.

## Implementation sketch

- Extend `updateConfirmedBooking` and `updateChannelReservation` to accept `room_id`.
- Shared helper (e.g. `changeStayRoomType` validation) for: known room, capacity on target type, clear unit, preserve totals.
- Inbox pending: same field + update path before confirm.
- No schema migration; `booking_requests.room_id` / `room_name` / `room_unit_id` already exist.

## Errors

- Unknown or missing room type → reject with message
- Insufficient capacity on new type → reject with sold-out style message
- Auth / ACL: staff write calendar (or existing inbox staff auth) only

## Tests

- Capacity failure blocks the change
- Success updates type + name, clears unit, keeps total
- Same type is a no-op for type-change side effects
- Channel stay path updates block room type the same way

## Out of scope

- Re-quoting or charging a difference
- Drag-and-drop between calendar rows
- Automatic door reassignment
- Guest-facing room type change
