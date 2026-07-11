"use client";

import { useState } from "react";
import {
  confirmBookingRequest,
  declineBookingRequest,
} from "@/app/actions";

const CONFIRM_DEFAULT =
  "Good news — your room is confirmed. We will follow up with arrival details and the remaining balance shortly.";

const DECLINE_DEFAULT =
  "Thank you for your request. We are sorry, but this room is not available for those dates. Reply with flexible dates and we can help find another option.";

type DecisionMode = null | "confirm" | "decline";

type StaffRequestDecisionPanelProps = {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  depositPaid: boolean;
  depositAmount: number;
  canManage: boolean;
};

export function StaffRequestDecisionPanel({
  bookingId,
  guestName,
  guestEmail,
  depositPaid,
  depositAmount,
  canManage,
}: StaffRequestDecisionPanelProps) {
  const [mode, setMode] = useState<DecisionMode>(null);
  const [confirmMessage, setConfirmMessage] = useState(CONFIRM_DEFAULT);
  const [declineMessage, setDeclineMessage] = useState(DECLINE_DEFAULT);

  if (!canManage) {
    return (
      <div className="staff-decide">
        <h3 className="staff-decide__title">Decide</h3>
        <p className="detail-help" role="status">
          This request cannot be confirmed or declined here — it is sample data
          or missing a database record. Add Supabase to manage live requests.
        </p>
      </div>
    );
  }

  if (mode === "confirm") {
    return (
      <div className="staff-decide staff-decide--confirming">
        <h3 className="staff-decide__title">Confirm stay</h3>
        <p className="staff-decide__summary">
          Email <strong>{guestName}</strong> at <strong>{guestEmail}</strong>,
          then move this stay to the calendar.
          {depositPaid
            ? ` Their $${depositAmount} deposit already holds the room.`
            : " No deposit is on record yet."}
        </p>
        <form action={confirmBookingRequest} className="staff-decide__form">
          <input name="booking-id" type="hidden" value={bookingId} />
          <div className="field-pair">
            <label htmlFor="confirm-staff-message">Email to guest</label>
            <textarea
              id="confirm-staff-message"
              name="staff-message"
              onChange={(event) => setConfirmMessage(event.target.value)}
              required
              rows={4}
              value={confirmMessage}
            />
          </div>
          <div className="staff-decide__actions">
            <button className="button button--primary" type="submit">
              Send confirmation
            </button>
            <button
              className="button button--quiet"
              onClick={() => setMode(null)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === "decline") {
    return (
      <div className="staff-decide staff-decide--declining">
        <h3 className="staff-decide__title">Decline request</h3>
        <p className="staff-decide__summary">
          Email <strong>{guestName}</strong> at <strong>{guestEmail}</strong>,
          then close this request
          {depositPaid ? ` and refund their $${depositAmount} deposit` : ""}.
          This cannot be undone from here.
        </p>
        <form action={declineBookingRequest} className="staff-decide__form">
          <input name="booking-id" type="hidden" value={bookingId} />
          <div className="field-pair">
            <label htmlFor="decline-staff-message">Email to guest</label>
            <textarea
              id="decline-staff-message"
              name="staff-message"
              onChange={(event) => setDeclineMessage(event.target.value)}
              required
              rows={4}
              value={declineMessage}
            />
          </div>
          <div className="staff-decide__actions">
            <button className="button button--danger" type="submit">
              {depositPaid ? "Decline, refund, and email" : "Decline and email"}
            </button>
            <button
              className="button button--quiet"
              onClick={() => setMode(null)}
              type="button"
            >
              Keep request
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="staff-decide">
      <h3 className="staff-decide__title">Decide</h3>
      <p className="detail-help">
        Confirm moves the stay to the calendar and emails the guest. Decline
        closes the request
        {depositPaid ? ", refunds the deposit," : ""} and emails them. You will
        review the message before it sends.
      </p>
      <div className="staff-decide__actions">
        <button
          className="button button--primary"
          onClick={() => setMode("confirm")}
          type="button"
        >
          Confirm stay…
        </button>
        <button
          className="button button--quiet"
          onClick={() => setMode("decline")}
          type="button"
        >
          Decline…
        </button>
      </div>
    </div>
  );
}
