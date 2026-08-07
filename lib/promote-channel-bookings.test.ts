import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { WALK_IN_GUEST_EMAIL } from "./booking-chat";
import {
  bookingInsertFromChannelBlock,
  isPromotableChannelBlock,
} from "./promote-channel-bookings";
import type { RoomBlockRow } from "./supabase";

function block(
  partial: Partial<RoomBlockRow> &
    Pick<RoomBlockRow, "id" | "room_id" | "start_date" | "end_date">,
): RoomBlockRow {
  return {
    reason: "Reserved",
    staff_note: null,
    guest_name: null,
    guest_email: null,
    guest_phone: null,
    staff_booking_source: null,
    ical_feed_id: null,
    ical_uid: null,
    room_unit_id: null,
    created_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("promote channel bookings", () => {
  it("treats iCal and OTA-tagged blocks as promotable, not plain closures", () => {
    assert.equal(
      isPromotableChannelBlock(
        block({
          id: "1",
          room_id: "superior",
          start_date: "2026-08-10",
          end_date: "2026-08-12",
          ical_feed_id: "feed-1",
        }),
      ),
      true,
    );
    assert.equal(
      isPromotableChannelBlock(
        block({
          id: "2",
          room_id: "superior",
          start_date: "2026-08-10",
          end_date: "2026-08-12",
          staff_booking_source: "airbnb",
        }),
      ),
      true,
    );
    assert.equal(
      isPromotableChannelBlock(
        block({
          id: "3",
          room_id: "superior",
          start_date: "2026-08-10",
          end_date: "2026-08-12",
          reason: "Closed",
        }),
      ),
      false,
    );
  });

  it("maps a channel block into a walk-in-shaped confirmed booking with chat token", () => {
    const insert = bookingInsertFromChannelBlock({
      row: block({
        id: "block-1",
        room_id: "superior",
        start_date: "2026-08-10",
        end_date: "2026-08-13",
        guest_name: "Alex Guest",
        guest_email: "alex@example.com",
        guest_phone: "+66812345678",
        staff_booking_source: "airbnb",
        staff_note: "Early check-in",
        room_unit_id: "unit-9",
      }),
      roomName: "Superior",
      paidAt: "2026-08-01T12:00:00.000Z",
    });

    assert.ok(insert);
    assert.equal(insert.guest_name, "Alex Guest");
    assert.equal(insert.guest_email, "alex@example.com");
    assert.equal(insert.booking_source, "airbnb");
    assert.equal(insert.status, "confirmed");
    assert.equal(insert.nights, 3);
    assert.equal(insert.room_unit_id, "unit-9");
    assert.equal(insert.deposit_paid_at, "2026-08-01T12:00:00.000Z");
    assert.ok(insert.conversation_token);
    assert.match(insert.conversation_token!, /^[0-9a-f-]{36}$/i);
  });

  it("uses the walk-in placeholder when there is no guest email", () => {
    const insert = bookingInsertFromChannelBlock({
      row: block({
        id: "block-2",
        room_id: "family",
        start_date: "2026-09-01",
        end_date: "2026-09-03",
        ical_feed_id: "feed-2",
        staff_booking_source: null,
      }),
      roomName: "Family",
      channelLabel: "Booking.com",
      paidAt: "2026-08-01T12:00:00.000Z",
    });

    assert.ok(insert);
    assert.equal(insert.guest_email, WALK_IN_GUEST_EMAIL);
    assert.equal(insert.conversation_token, null);
    assert.equal(insert.booking_source, "booking");
    assert.equal(insert.guest_name, "Booking.com");
  });

  it("skips invalid stay lengths", () => {
    assert.equal(
      bookingInsertFromChannelBlock({
        row: block({
          id: "block-3",
          room_id: "superior",
          start_date: "2026-08-10",
          end_date: "2026-08-10",
          staff_booking_source: "expedia",
        }),
        roomName: "Superior",
      }),
      null,
    );
  });
});
