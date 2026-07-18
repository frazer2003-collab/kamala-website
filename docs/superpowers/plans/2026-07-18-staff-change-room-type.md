# Staff Change Room Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let staff move any stay (calendar booking, channel reservation, inbox request) to a different room type while keeping the booked price and clearing the door number.

**Architecture:** A pure helper decides whether the type changed and forces `room_unit_id` to null. Existing staff update actions accept `room-id`, check capacity on the **new** type like a new booking (no exclude-self), update `room_id`/`room_name`, and skip re-quoting when the type changes. UI adds a Room type select on the three staff surfaces.

**Tech Stack:** Next.js App Router, Supabase (`booking_requests`, `room_blocks`), existing `redirectIfStayOverlaps` / `getRoomForBooking` / `getStaffRooms`, Node `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-07-18-staff-change-room-type-design.md`

## Global Constraints

- Keep `estimated_total` and all payment fields unchanged when room type changes (no re-quote)
- Capacity on the new type uses the same rules as a normal booking; do **not** pass `excludeBookingId` / `excludeBlockId` for the type-change capacity check
- Always clear `room_unit_id` when room type changes (ignore any door number submitted in the same save)
- Any catalog room type allowed (upgrade / lateral / downgrade)
- Surfaces: calendar booking panel, channel stay panel, inbox request detail
- Helper copy: `Changing room type keeps the booked price. Room number is cleared.`
- No booking_requests schema migration
- Do not commit unless the user asks (plan Commit steps are optional / skip if not requested)

## File map

| File | Responsibility |
| --- | --- |
| `lib/room-type-change.ts` | Pure plan: detect type change, clear unit, validate known room |
| `lib/room-type-change.test.ts` | Unit tests for the helper |
| `app/actions.ts` | Wire type change into booking + channel updates; add inbox action |
| `components/calendar-booking-panel.tsx` | Room type select |
| `components/calendar-block-panel.tsx` | Room type select for channel stays |
| `components/staff-inbox-room-type-form.tsx` | Small inbox-only form |
| `app/staff/calendar/page.tsx` | Pass `rooms` into booking panel |
| `app/staff/page.tsx` | Load rooms; render inbox room-type form |

---

### Task 1: Pure room-type-change helper + tests

**Files:**
- Create: `lib/room-type-change.ts`
- Create: `lib/room-type-change.test.ts`

**Interfaces:**
- Produces:
  - `type RoomTypeOption = { id: string; name: string }`
  - `type RoomTypeChangeResult =`
    - `{ ok: true; roomId: string; roomName: string; roomIdChanged: boolean; roomUnitId: string | null }`
    - `{ ok: false; error: "unknown-room" }`
  - `resolveRoomTypeChange(input: { currentRoomId: string; requestedRoomId: string; rooms: RoomTypeOption[]; formRoomUnitId: string | null }): RoomTypeChangeResult`

- [ ] **Step 1: Write the failing test**

```ts
// lib/room-type-change.test.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRoomTypeChange } from "./room-type-change";

const rooms = [
  { id: "courtyard", name: "Superior" },
  { id: "garden", name: "Deluxe" },
];

describe("resolveRoomTypeChange", () => {
  it("rejects unknown room ids", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "nope",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, { ok: false, error: "unknown-room" });
  });

  it("keeps unit when type is unchanged", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "courtyard",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, {
      ok: true,
      roomId: "courtyard",
      roomName: "Superior",
      roomIdChanged: false,
      roomUnitId: "unit-1",
    });
  });

  it("clears unit when type changes even if form sends a unit", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "courtyard",
      requestedRoomId: "garden",
      rooms,
      formRoomUnitId: "unit-1",
    });
    assert.deepEqual(result, {
      ok: true,
      roomId: "garden",
      roomName: "Deluxe",
      roomIdChanged: true,
      roomUnitId: null,
    });
  });

  it("treats empty requested id as current room", () => {
    const result = resolveRoomTypeChange({
      currentRoomId: "garden",
      requestedRoomId: "",
      rooms,
      formRoomUnitId: null,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.roomId, "garden");
      assert.equal(result.roomIdChanged, false);
    }
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- lib/room-type-change.test.ts`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement helper**

```ts
// lib/room-type-change.ts
export type RoomTypeOption = {
  id: string;
  name: string;
};

export type RoomTypeChangeResult =
  | {
      ok: true;
      roomId: string;
      roomName: string;
      roomIdChanged: boolean;
      roomUnitId: string | null;
    }
  | { ok: false; error: "unknown-room" };

export function resolveRoomTypeChange(input: {
  currentRoomId: string;
  requestedRoomId: string;
  rooms: RoomTypeOption[];
  formRoomUnitId: string | null;
}): RoomTypeChangeResult {
  const requestedRoomId = input.requestedRoomId.trim() || input.currentRoomId;
  const room = input.rooms.find((entry) => entry.id === requestedRoomId);
  if (!room) {
    return { ok: false, error: "unknown-room" };
  }

  const roomIdChanged = room.id !== input.currentRoomId;
  return {
    ok: true,
    roomId: room.id,
    roomName: room.name,
    roomIdChanged,
    roomUnitId: roomIdChanged ? null : input.formRoomUnitId,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test -- lib/room-type-change.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit (optional)**

```bash
git add lib/room-type-change.ts lib/room-type-change.test.ts
git commit -m "Add room type change helper for staff upgrades."
```

---

### Task 2: Server actions — calendar booking, channel, inbox

**Files:**
- Modify: `app/actions.ts` (`updateConfirmedBooking`, `updateChannelReservation`; add `updateInboxBookingRoomType`)
- Modify: import `resolveRoomTypeChange` from `@/lib/room-type-change` and use `getStaffRooms` from `@/lib/rooms`

**Interfaces:**
- Consumes: `resolveRoomTypeChange`, `getStaffRooms`, `getRoomForBooking`, `redirectIfStayOverlaps`
- Produces:
  - `updateConfirmedBooking` reads form field `room-id`
  - `updateChannelReservation` reads form field `room-id`
  - `updateInboxBookingRoomType(formData: FormData): Promise<void>` — fields `booking-id`, `room-id`; redirects to `/staff?booking=…`

- [ ] **Step 1: Wire `updateConfirmedBooking`**

After reading `roomUnitId` (around the existing form reads), add:

```ts
const requestedRoomId = getValue(formData, "room-id");
const staffRooms = await getStaffRooms();
const typeChange = resolveRoomTypeChange({
  currentRoomId: booking.room_id,
  requestedRoomId,
  rooms: staffRooms.map((room) => ({ id: room.id, name: room.name })),
  formRoomUnitId: roomUnitId,
});

if (!typeChange.ok) {
  redirect(`${bookingHref}&error=invalid-room-type`);
}

const nextRoom = await getRoomForBooking(typeChange.roomId);
if (!nextRoom) {
  redirect(`${bookingHref}&error=invalid-room-type`);
}

const effectiveRoomUnitId = typeChange.roomUnitId;
```

Replace the existing capacity block that only runs when `!datesUnchanged` with:

```ts
const datesUnchanged =
  arrival === booking.arrival_date && departure === booking.departure_date;

if (typeChange.roomIdChanged) {
  // Spec: like a normal booking — no excludeBookingId.
  await redirectIfStayOverlaps(
    bookingHref,
    typeChange.roomId,
    arrival,
    departure,
    nextRoom.availableCount,
  );
} else if (!datesUnchanged) {
  await redirectIfStayOverlaps(
    bookingHref,
    booking.room_id,
    arrival,
    departure,
    nextRoom.availableCount,
    { excludeBookingId: bookingId },
  );
}
```

Unit eligibility / conflict checks must use `typeChange.roomId` and `effectiveRoomUnitId` (skip unit checks when `effectiveRoomUnitId` is null).

Quote / total:

```ts
const estimatedTotal = typeChange.roomIdChanged
  ? booking.estimated_total
  : (
      await quoteRoomStay(
        typeChange.roomId,
        nextRoom.rate,
        arrival,
        departure,
      )
    ).total;
```

Core update payload must include when type changed:

```ts
{
  // ...existing guest/date/note/status fields...
  estimated_total: estimatedTotal,
  ...(typeChange.roomIdChanged
    ? {
        room_id: typeChange.roomId,
        room_name: typeChange.roomName,
      }
    : {}),
}
```

Pass `effectiveRoomUnitId` into `staff_set_booking_room_unit` / fallback unit update (null when type changed).

- [ ] **Step 2: Wire `updateChannelReservation`**

Same pattern after loading `block`:

```ts
const requestedRoomId = getValue(formData, "room-id");
const staffRooms = await getStaffRooms();
const typeChange = resolveRoomTypeChange({
  currentRoomId: block.room_id,
  requestedRoomId,
  rooms: staffRooms.map((room) => ({ id: room.id, name: room.name })),
  formRoomUnitId: roomUnitId,
});
if (!typeChange.ok) {
  redirect(`${blockHref}&error=invalid-room-type`);
}
const nextRoom = await getRoomForBooking(typeChange.roomId);
if (!nextRoom) {
  redirect(`${blockHref}&error=invalid-room-type`);
}
const effectiveRoomUnitId = typeChange.roomUnitId;

const datesUnchanged =
  arrival === block.start_date && departure === block.end_date;

if (typeChange.roomIdChanged) {
  await redirectIfStayOverlaps(
    blockHref,
    typeChange.roomId,
    arrival,
    departure,
    nextRoom.availableCount,
  );
} else if (!datesUnchanged) {
  await redirectIfStayOverlaps(
    blockHref,
    block.room_id,
    arrival,
    departure,
    nextRoom.availableCount,
    { excludeBlockId: blockId },
  );
}
```

Use `effectiveRoomUnitId` for unit validation against `typeChange.roomId`.

After a successful RPC update (which today does not set `room_id`), if `typeChange.roomIdChanged`:

```ts
const { error: roomTypeError } = await supabase
  .from("room_blocks")
  .update({
    room_id: typeChange.roomId,
    room_unit_id: null,
  })
  .eq("id", blockId);

if (roomTypeError) {
  redirect(appendCalendarError(blockHref, "save-failed", roomTypeError.message));
}
```

Also include `room_id: typeChange.roomId` and `room_unit_id: effectiveRoomUnitId` in the direct-update fallback path so RPC-missing environments still persist the type change.

- [ ] **Step 3: Add inbox action**

```ts
export async function updateInboxBookingRoomType(formData: FormData) {
  await requireStaffCalendarWrite();

  const bookingId = getValue(formData, "booking-id");
  const requestedRoomId = getValue(formData, "room-id");
  const booking = await getBookingForStaff(bookingId);
  const inboxHref = bookingId
    ? `/staff?booking=${encodeURIComponent(bookingId)}`
    : "/staff";

  if (!booking || booking.status === "declined") {
    redirect("/staff");
  }

  const staffRooms = await getStaffRooms();
  const typeChange = resolveRoomTypeChange({
    currentRoomId: booking.room_id,
    requestedRoomId,
    rooms: staffRooms.map((room) => ({ id: room.id, name: room.name })),
    formRoomUnitId: booking.room_unit_id,
  });

  if (!typeChange.ok) {
    redirect(`${inboxHref}&error=invalid-room-type`);
  }

  if (!typeChange.roomIdChanged) {
    redirect(inboxHref);
  }

  const nextRoom = await getRoomForBooking(typeChange.roomId);
  if (!nextRoom) {
    redirect(`${inboxHref}&error=invalid-room-type`);
  }

  await redirectIfStayOverlaps(
    inboxHref,
    typeChange.roomId,
    booking.arrival_date,
    booking.departure_date,
    nextRoom.availableCount,
  );

  const supabase = createStaffSupabaseClient();
  const { error } = await supabase
    .from("booking_requests")
    .update({
      room_id: typeChange.roomId,
      room_name: typeChange.roomName,
      room_unit_id: null,
    })
    .eq("id", bookingId);

  if (error) {
    redirect(`${inboxHref}&error=save-failed`);
  }

  revalidatePath("/staff");
  revalidatePath("/staff/calendar");
  redirect(`${inboxHref}&saved=1`);
}
```

Ensure `appendOverlapErrorToHref` works with `/staff?booking=…` URLs (it should append `&error=…` query params the same way as calendar). If overlap helper assumes calendar-only copy, still reuse it — staff will see the overlap error query on the inbox URL; map `invalid-room-type` / overlap in inbox UI in Task 3 if not already handled.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 5: Commit (optional)**

```bash
git add app/actions.ts
git commit -m "Allow staff to change booking and channel room types."
```

---

### Task 3: Staff UI — calendar booking, channel, inbox

**Files:**
- Modify: `components/calendar-booking-panel.tsx`
- Modify: `components/calendar-block-panel.tsx`
- Create: `components/staff-inbox-room-type-form.tsx`
- Modify: `app/staff/calendar/page.tsx` (pass `rooms` into `CalendarBookingPanel`)
- Modify: `app/staff/page.tsx` (load `getStaffRooms`, render form, surface errors)

**Interfaces:**
- Consumes: `updateInboxBookingRoomType`, `Room` from `@/lib/content` (`{ id, name }`)
- Produces: form field `name="room-id"` on all three surfaces

- [ ] **Step 1: Booking panel**

Add prop:

```ts
rooms: Array<{ id: string; name: string }>;
```

Include `roomId` in `fields` state (init from prop `roomId`). Place a select **above** the Room number field:

```tsx
<div className="field-pair">
  <label htmlFor={`calendar-room-type-${bookingKey}`}>Room type</label>
  <select
    disabled={!canManage}
    id={`calendar-room-type-${bookingKey}`}
    name="room-id"
    onChange={(event) =>
      setFields((current) => ({
        ...current,
        roomId: event.target.value,
        roomUnitId: "", // match server: clear door on type change
      }))
    }
    value={fields.roomId}
  >
    {rooms.map((room) => (
      <option key={room.id} value={room.id}>
        {room.name}
      </option>
    ))}
  </select>
  <p className="detail-help">
    Changing room type keeps the booked price. Room number is cleared.
  </p>
</div>
```

Update `assignableUnits` `useMemo` to use `fields.roomId` instead of prop `roomId`.

In `app/staff/calendar/page.tsx`, pass:

```tsx
rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
```

(calendar page already loads `rooms`).

- [ ] **Step 2: Channel block panel**

Add prop `rooms: Array<{ id: string; name: string }>`. For channel stays (`isChannel`), replace the read-only Room `<dd>` with an editable select in the form (or add the select inside the channel edit form) using `name="room-id"`, state `fields.roomId` initialized from `block.roomId` / `room?.id`, clearing `roomUnitId` on change. Same helper copy. Recompute `unitOptions` with `fields.roomId`. Pass `rooms` from calendar page into `CalendarBlockPanel`.

- [ ] **Step 3: Inbox form component**

```tsx
// components/staff-inbox-room-type-form.tsx
"use client";

import { useState } from "react";
import { updateInboxBookingRoomType } from "@/app/actions";

type Props = {
  bookingId: string;
  roomId: string;
  rooms: Array<{ id: string; name: string }>;
  canManage: boolean;
  formError?: string | null;
};

export function StaffInboxRoomTypeForm({
  bookingId,
  roomId,
  rooms,
  canManage,
  formError,
}: Props) {
  const [selectedRoomId, setSelectedRoomId] = useState(roomId);

  return (
    <form action={updateInboxBookingRoomType} className="calendar-manage-form">
      <input name="booking-id" type="hidden" value={bookingId} />
      {formError ? (
        <p className="form-message form-message--error" role="alert">
          {formError}
        </p>
      ) : null}
      <div className="field-pair">
        <label htmlFor={`inbox-room-type-${bookingId}`}>Room type</label>
        <select
          disabled={!canManage}
          id={`inbox-room-type-${bookingId}`}
          name="room-id"
          onChange={(event) => setSelectedRoomId(event.target.value)}
          value={selectedRoomId}
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        <p className="detail-help">
          Changing room type keeps the booked price. Room number is cleared.
        </p>
      </div>
      <button className="button button--secondary" disabled={!canManage} type="submit">
        Update room type
      </button>
    </form>
  );
}
```

In `app/staff/page.tsx`:

- `const rooms = await getStaffRooms()` (parallel with existing loads)
- Read `error` / `detail` from `searchParams` if calendar-style errors are reused; map `invalid-room-type` → `"That room type is not available."` and overlap errors to the existing overlap message helper if one exists for calendar
- Above or instead of the static `<dd>{selected.room}</dd>`, when `selected.databaseId` and request is open, render:

```tsx
<StaffInboxRoomTypeForm
  bookingId={selected.databaseId}
  canManage={canManageSelected}
  formError={inboxRoomTypeError}
  roomId={selected.roomId}
  rooms={rooms.map((room) => ({ id: room.id, name: room.name }))}
/>
```

Keep the total line read-only so staff see price is unchanged.

- [ ] **Step 4: Map calendar errors**

In `app/staff/calendar/page.tsx` (and inbox if needed), ensure query `error=invalid-room-type` shows a clear message, e.g. `"Choose a valid room type."` — follow the existing `formError` / `error=` mapping pattern already used for `invalid-room-number`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`  
Expected: PASS

- [ ] **Step 6: Manual smoke (developer)**

1. Open a confirmed calendar booking → change room type → Save → stay moves to new type row; door unassigned; total unchanged  
2. Repeat with a sold-out target type → blocked with overlap/sold-out error  
3. Channel stay → change type → block moves; door cleared  
4. Inbox open request → Update room type → detail shows new room name; total unchanged  

- [ ] **Step 7: Commit (optional)**

```bash
git add components/calendar-booking-panel.tsx components/calendar-block-panel.tsx components/staff-inbox-room-type-form.tsx app/staff/calendar/page.tsx app/staff/page.tsx
git commit -m "Add staff UI to change room type on stays."
```

---

## Spec coverage check

| Spec requirement | Task |
| --- | --- |
| Keep booked price / no re-quote on type change | Task 2 |
| Any room type | Task 3 selects from `getStaffRooms()` |
| Capacity like normal booking (no exclude-self on type change) | Task 2 |
| Always clear door number | Task 1 + Task 2 + Task 3 client clear |
| Calendar booking panel | Task 3 |
| Channel stay panel | Task 2 + Task 3 |
| Inbox pending | Task 2 + Task 3 |
| Helper copy | Task 3 |
| Tests for helper / capacity side effects covered by action wiring | Task 1 (+ manual smoke Task 3) |
| No booking schema migration | Honored (channel `room_id` updated via table write) |
