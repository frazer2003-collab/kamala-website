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
        <h3 className="staff-decide__title">Checkout hold</h3>
        <p className="detail-help" role="status">
          Connect Supabase to release abandoned checkout holds.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="staff-decide staff-decide--declining">
        <h3 className="staff-decide__title">Release checkout hold</h3>
        <p className="staff-decide__summary">
          Remove <strong>{guestName}</strong>&apos;s unfinished booking and
          free those dates on the calendar. No payment was received and no
          email is sent. This cannot be undone.
        </p>
        <form action={releaseCheckoutHoldBooking} className="staff-decide__form">
          <StaffFormBusyBridge />
          <input name="booking-id" type="hidden" value={bookingId} />
          <div className="staff-decide__actions">
            <button className="button button--danger" type="submit">
              Release hold
            </button>
            <button
              className="button button--quiet"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Keep hold
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="staff-decide staff-decide--quiet">
      <h3 className="staff-decide__title">Checkout hold</h3>
      <p className="staff-decide__summary" role="status">
        The guest started booking but did not finish payment. These dates stay
        reserved until they pay or you release the hold.
      </p>
      <p className="detail-help">
        Release only if the guest abandoned checkout or asked you to cancel.
      </p>
      <div className="staff-decide__actions">
        <button
          className="button button--danger"
          onClick={() => setConfirming(true)}
          type="button"
        >
          Release hold…
        </button>
      </div>
    </div>
  );
}
