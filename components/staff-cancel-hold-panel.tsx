"use client";

import { useState } from "react";
import { cancelBookingHoldBooking } from "@/app/actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";

type HoldKind = "unfinished-checkout" | "bank-transfer-hold";

type StaffCancelHoldPanelProps = {
  bookingId: string;
  guestName: string;
  canManage: boolean;
  holdKind: HoldKind;
};

const COPY: Record<
  HoldKind,
  {
    title: string;
    summary: string;
    help: string;
    confirmTitle: string;
    confirmSummary: (guest: string) => string;
    submit: string;
  }
> = {
  "unfinished-checkout": {
    title: "Unfinished checkout",
    summary:
      "The guest started booking but has not paid and has not tapped “I've paid” on QR/bank transfer. These dates stay available for other guests.",
    help: "Cancel if the guest abandoned checkout or asked you to remove the record.",
    confirmTitle: "Cancel unfinished checkout",
    confirmSummary: (guest) =>
      `Remove ${guest}'s unfinished booking record. These dates were never held — no payment was received and no email is sent.`,
    submit: "Cancel hold",
  },
  "bank-transfer-hold": {
    title: "Bank transfer claim",
    summary:
      "The guest reported a Thai QR / bank transfer. These dates stay available for other guests until you confirm payment.",
    help: "Cancel removes the request if no payment arrived. No email is sent — use Decline below if you need to message the guest.",
    confirmTitle: "Cancel bank transfer claim",
    confirmSummary: (guest) =>
      `Remove ${guest}'s bank-transfer request. Dates were not held on the guest calendar — no refund is needed and no email is sent.`,
    submit: "Cancel claim",
  },
};

export function StaffCancelHoldPanel({
  bookingId,
  guestName,
  canManage,
  holdKind,
}: StaffCancelHoldPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const copy = COPY[holdKind];

  if (!canManage) {
    return (
      <div className="staff-decide staff-decide--quiet">
        <h3 className="staff-decide__title">{copy.title}</h3>
        <p className="detail-help" role="status">
          Connect Supabase to cancel booking holds from Requests.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="staff-decide staff-decide--declining">
        <h3 className="staff-decide__title">{copy.confirmTitle}</h3>
        <p className="staff-decide__summary">
          {copy.confirmSummary(guestName)} This cannot be undone.
        </p>
        <form action={cancelBookingHoldBooking} className="staff-decide__form">
          <StaffFormBusyBridge />
          <input name="booking-id" type="hidden" value={bookingId} />
          <div className="staff-decide__actions">
            <button className="button button--danger" type="submit">
              {copy.submit}
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
    <div className="staff-decide staff-decide--quiet staff-decide--prereq">
      <h3 className="staff-decide__title">{copy.title}</h3>
      <p className="staff-decide__summary" role="status">
        {copy.summary}
      </p>
      <p className="detail-help">{copy.help}</p>
      <div className="staff-decide__actions">
        <button
          className="button button--danger"
          onClick={() => setConfirming(true)}
          type="button"
        >
          Cancel hold…
        </button>
      </div>
    </div>
  );
}
