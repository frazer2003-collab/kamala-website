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
  /** Guest message waiting — reply in conversation before confirming. */
  needsReply?: boolean;
  /** Stay is already confirmed — Confirm/Decline are not available. */
  alreadyConfirmed?: boolean;
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
  needsReply = false,
  alreadyConfirmed = false,
  practiceMode = false,
}: StaffRequestDecisionPanelProps) {
  const depositLabel = formatMoneySuffix(depositAmount, currency);
  const [mode, setMode] = useState<DecisionMode>(null);
  const [confirmMessage, setConfirmMessage] = useState(CONFIRM_DEFAULT);
  const [declineMessage, setDeclineMessage] = useState(DECLINE_DEFAULT);
  const [practiceResult, setPracticeResult] = useState<PracticeResult>(null);
  const [transferVerified, setTransferVerified] = useState(false);

  const needsTransferGate = bankTransferClaimed && !depositPaid && !alreadyConfirmed;
  const confirmBlockedByTransfer = needsTransferGate && !transferVerified;
  const decisionsLocked = alreadyConfirmed;
  const confirmBlocked = decisionsLocked || confirmBlockedByTransfer;
  const declineBlocked = decisionsLocked;
  /** Need-reply is finished via Close conversation — Confirm stays for booking gates. */
  const confirmIsSecondary = !alreadyConfirmed && (needsReply || needsTransferGate);

  if (!canManage && !practiceMode) {
    return (
      <div className="staff-decide staff-decide--quiet">
        <h3 className="staff-decide__title">Close the request</h3>
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
            ? depositPaid
              ? "In live mode this would email the guest and mark the stay confirmed (card-paid stays are already on the calendar)."
              : "In live mode this would email the guest and move the stay to the calendar."
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

  function openConfirm() {
    if (confirmBlocked) {
      return;
    }
    setMode("confirm");
  }

  function openDecline() {
    if (declineBlocked) {
      return;
    }
    setMode("decline");
  }

  if (mode === "confirm" && !alreadyConfirmed) {
    return (
      <div className="staff-decide staff-decide--confirming">
        <h3 className="staff-decide__title">Confirm stay</h3>
        {practiceMode ? (
          <p className="staff-decide__practice-banner" role="status">
            Practice mode — nothing is emailed or saved.
          </p>
        ) : null}
        <p className="staff-decide__summary">
          Email <strong>{guestName}</strong> at <strong>{guestEmail}</strong>
          {depositPaid
            ? ", then mark this stay confirmed."
            : ", then move this stay onto the calendar."}
          {depositPaid
            ? ` They already paid ${depositLabel} — card-paid stays are already on the calendar; Confirm closes the inbox request and emails arrival details.`
            : bankTransferClaimed
              ? " The guest reported a bank transfer; verify it before sending confirmation."
              : " No payment is on record yet."}
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

  if (mode === "decline" && !alreadyConfirmed) {
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
    <div
      className={`staff-decide staff-decide--quiet${
        confirmIsSecondary ? " staff-decide--prereq" : ""
      }`}
    >
      <h3 className="staff-decide__title">Close the request</h3>
      {practiceMode ? (
        <p className="staff-decide__practice-banner" role="status">
          Practice mode — walk through confirm or decline without contacting the
          guest.
        </p>
      ) : null}
      {alreadyConfirmed ? (
        <p className="staff-decide__summary" role="status">
          This stay is already on the calendar as confirmed. Confirm stay and
          Decline are unavailable — reply in the conversation above
          {needsReply ? ", then Close conversation when finished" : ""}.
        </p>
      ) : null}
      {!alreadyConfirmed && needsReply ? (
        <p className="staff-decide__summary" role="status">
          Guest is waiting on a reply above. When you are finished, use{" "}
          <strong>Close conversation</strong> — that clears the message history
          and removes Need reply. No confirmation email is sent.
        </p>
      ) : null}
      {needsTransferGate ? (
        <p className="staff-decide__summary" role="status">
          Guest reported a bank transfer — verify it in your bank app before
          confirming.
        </p>
      ) : null}
      {!alreadyConfirmed && !needsReply && !needsTransferGate ? (
        <p className="detail-help">
          {depositPaid
            ? "Card-paid stays are already on the calendar. Confirm emails the guest and closes this inbox request. Decline refunds and emails them. You will review the message before it sends."
            : "Confirm verifies payment when needed, moves the stay to the calendar, and emails the guest. Decline closes the request and emails them. You will review the message before it sends."}
        </p>
      ) : null}
      {!alreadyConfirmed && (needsReply || needsTransferGate) ? (
        <p className="detail-help">
          {needsReply
            ? "Confirm stay is only for booking confirmation (for example after verifying a bank transfer). Decline still closes the request"
            : "Decline still closes the request"}
          {depositPaid ? ", refunds their payment," : ""} and emails them when
          you are ready.
        </p>
      ) : null}
      {needsTransferGate ? (
        <fieldset className="staff-decide__gates">
          <legend className="sr-only">Before confirming</legend>
          <label className="staff-decide__gate">
            <input
              checked={transferVerified}
              onChange={(event) => setTransferVerified(event.target.checked)}
              type="checkbox"
            />
            <span>I verified this transfer in the bank app</span>
          </label>
        </fieldset>
      ) : null}
      <div className="staff-decide__actions">
        <button
          aria-disabled={confirmBlocked || undefined}
          className={
            confirmBlocked
              ? "button button--secondary"
              : confirmIsSecondary
                ? "button button--secondary"
                : "button button--primary"
          }
          disabled={confirmBlocked}
          onClick={openConfirm}
          title={
            alreadyConfirmed
              ? "This stay is already confirmed"
              : confirmBlockedByTransfer
                ? "Verify the bank transfer first"
                : undefined
          }
          type="button"
        >
          Confirm stay…
        </button>
        <button
          aria-disabled={declineBlocked || undefined}
          className="button button--quiet"
          disabled={declineBlocked}
          onClick={openDecline}
          title={
            alreadyConfirmed ? "This stay is already confirmed" : undefined
          }
          type="button"
        >
          Decline…
        </button>
      </div>
    </div>
  );
}
