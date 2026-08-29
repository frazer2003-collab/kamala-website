"use client";

import { useState } from "react";
import { releaseCheckoutHoldBooking } from "@/app/actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";

type StaffCheckoutHoldPanelProps = {
  bookingId: string;
  guestName: string;
  canManage: boolean;
};

export function StaffCheckoutHoldPanel({
  bookingId,
  guestName,
  canManage,
}: StaffCheckoutHoldPanelProps) {
  const [confirming, setConfirming] = useState(false);

  if (!canManage) {
    return (
      <div className="staff-decide staff-decide--quiet">
        <h3 className="staff-decide__title">Unfinished checkout</h3>
        <p className="detail-help" role="status">
          Connect Supabase to remove abandoned checkout records.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="staff-decide staff-decide--declining">
        <h3 className="staff-decide__title">Remove unfinished checkout</h3>
        <p className="staff-decide__summary">
          Remove <strong>{guestName}</strong>&apos;s unfinished booking record.
          These dates were never held — no payment was received and no email is
          sent. This cannot be undone.
        </p>
        <form action={releaseCheckoutHoldBooking} className="staff-decide__form">
          <StaffFormBusyBridge />
          <input name="booking-id" type="hidden" value={bookingId} />
          <div className="staff-decide__actions">
            <button className="button button--danger" type="submit">
              Remove record
            </button>
            <button
              className="button button--quiet"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Keep record
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="staff-decide staff-decide--quiet">
      <h3 className="staff-decide__title">Unfinished checkout</h3>
      <p className="staff-decide__summary" role="status">
        The guest started booking but has not paid and has not tapped
        &ldquo;I&apos;ve paid&rdquo; on QR/bank transfer. These dates stay
        available for other guests.
      </p>
      <p className="detail-help">
        Remove the record if the guest abandoned checkout or asked you to cancel.
      </p>
      <div className="staff-decide__actions">
        <button
          className="button button--danger"
          onClick={() => setConfirming(true)}
          type="button"
        >
          Remove record…
        </button>
      </div>
    </div>
  );
}
