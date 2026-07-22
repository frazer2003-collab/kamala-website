"use client";
import { StaffFormBusyBridge } from "@/components/staff-busy";

import { useState, type FormEvent } from "react";
import {
  confirmBookingRequest,
  declineBookingRequest,
} from "@/app/actions";
import {
  formatMoneySuffix,
  type PropertyCurrency,
} from "@/lib/currency";

const CONFIRM_DEFAULT =
  "Good news — your room is confirmed. We will follow up shortly with arrival details.";

const DECLINE_DEFAULT =
  "Thank you for your request. We are sorry, but this room is not available for those dates. Reply with flexible dates and we can help find another option.";

type DecisionMode = null | "confirm" | "decline";
type PracticeResult = null | "confirmed" | "declined";

type StaffRequestDecisionPanelProps = {
  bookingId: string;
  guestName: string;
  guestEmail: string;
  depositPaid: boolean;
  bankTransferClaimed: boolean;
  depositAmount: number;
  currency?: PropertyCurrency;
  canManage: boolean;
  /** Paid stay that still needs date/room resolution with the guest. */
  paidOverbooked?: boolean;
  /** Sample inbox: full decide UI without writing to Supabase or emailing guests. */
  practiceMode?: boolean;
};

export function StaffRequestDecisionPanel({
  bookingId,
  guestName,
  guestEmail,
  depositPaid,
  bankTransferClaimed,
  depositAmount,
  currency = "thb",
  canManage,
  paidOverbooked = false,
  practiceMode = false,
}: StaffRequestDecisionPanelProps) {
  const depositLabel = formatMoneySuffix(depositAmount, currency);
  const [mode, setMode] = useState<DecisionMode>(null);
  const [confirmMessage, setConfirmMessage] = useState(CONFIRM_DEFAULT);
  const [declineMessage, setDeclineMessage] = useState(DECLINE_DEFAULT);
  const [practiceResult, setPracticeResult] = useState<PracticeResult>(null);

  if (!canManage && !practiceMode) {
    return (
      <div className="staff-decide">
        <h3 className="staff-decide__title">Decide</h3>
        <p className="detail-help" role="status">
          This request cannot be confirmed or declined here — it is missing a
          database record. Add Supabase to manage live requests.
        </p>
      </div>
    );
  }

  if (practiceResult) {
    return (
      <div className="staff-decide staff-decide--practice-done" role="status">
        <h3 className="staff-decide__title">Practice complete</h3>
        <p className="staff-decide__summary">
          {practiceResult === "confirmed"
            ? "In live mode this would email the guest and move the stay to the calendar."
            : "In live mode this would email the guest, close the request, and refund payment if one was paid."}
        </p>
        <div className="staff-decide__actions">
          <button
            className="button button--secondary"
            onClick={() => {
              setPracticeResult(null);
              setMode(null);
            }}
            type="button"
          >
            Practice again
          </button>
        </div>
      </div>
    );
  }

  function handlePracticeSubmit(
    event: FormEvent<HTMLFormElement>,
    result: Exclude<PracticeResult, null>,
  ) {
    event.preventDefault();
    setPracticeResult(result);
  }

  if (mode === "confirm") {
    return (
      <div className="staff-decide staff-decide--confirming">
        <h3 className="staff-decide__title">Confirm stay</h3>
        {practiceMode ? (
          <p className="staff-decide__practice-banner" role="status">
            Practice mode — nothing is emailed or saved.
          </p>
        ) : null}
        <p className="staff-decide__summary">
          Email <strong>{guestName}</strong> at <strong>{guestEmail}</strong>,
          then move this stay to the calendar.
          {depositPaid
            ? ` They already paid ${depositLabel} in full for the stay.`
            : bankTransferClaimed
              ? " The guest reported a bank transfer; verify it before sending confirmation."
            : " No payment is on record yet."}
          {paidOverbooked
            ? " These dates still look full — confirm only after you have settled dates or room with the guest."
            : null}
        </p>
        <form
          action={practiceMode ? undefined : confirmBookingRequest}
          className="staff-decide__form"
          onSubmit={
            practiceMode
              ? (event) => handlePracticeSubmit(event, "confirmed")
              : undefined
          }
        >
          <StaffFormBusyBridge />
          {!practiceMode ? (
            <input name="booking-id" type="hidden" value={bookingId} />
          ) : null}
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
              {practiceMode ? "Practice send confirmation" : "Send confirmation"}
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
        {practiceMode ? (
          <p className="staff-decide__practice-banner" role="status">
            Practice mode — nothing is emailed, refunded, or deleted.
          </p>
        ) : null}
        <p className="staff-decide__summary">
          Email <strong>{guestName}</strong> at <strong>{guestEmail}</strong>,
          then close this request
          {depositPaid ? ` and refund their ${depositLabel} payment` : ""}.
          This cannot be undone from here.
          {depositPaid && !practiceMode
            ? " If the refund fails, the request stays open so you can retry."
            : null}
        </p>
        <form
          action={practiceMode ? undefined : declineBookingRequest}
          className="staff-decide__form"
          onSubmit={
            practiceMode
              ? (event) => handlePracticeSubmit(event, "declined")
              : undefined
          }
        >
          <StaffFormBusyBridge />
          {!practiceMode ? (
            <input name="booking-id" type="hidden" value={bookingId} />
          ) : null}
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
              {practiceMode
                ? "Practice decline"
                : depositPaid
                  ? "Decline, refund, and email"
                  : "Decline and email"}
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
      {practiceMode ? (
        <p className="staff-decide__practice-banner" role="status">
          Practice mode — walk through confirm or decline without contacting the
          guest.
        </p>
      ) : null}
      {bankTransferClaimed && !depositPaid ? (
        <p className="staff-decide__summary" role="status">
          Guest reported a bank transfer — verify in your bank app, then confirm
          or decline.
        </p>
      ) : null}
      <p className="detail-help">
        Confirm moves the stay to the calendar and emails the guest. Decline
        closes the request
        {depositPaid ? ", refunds their payment," : ""} and emails them. You will
        review the message before it sends.
        {paidOverbooked
          ? " This paid stay still needs dates or a room worked out with the guest before you confirm."
          : null}
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
