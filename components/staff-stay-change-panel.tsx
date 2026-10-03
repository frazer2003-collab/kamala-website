"use client";

import { useState } from "react";
import {
  confirmStayChangeTransfer,
  declineStayChangeTransfer,
  markStayChangeRefundSent,
} from "@/app/staff/stay-change-actions";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";

type StaffStayChangePanelProps = {
  bookingId: string;
  canManage: boolean;
  currency: PropertyCurrency;
  guestName: string;
  pending: {
    roomName: string;
    dates: string;
    balance: number;
  } | null;
  refundDue: number;
};

export function StaffStayChangePanel({
  bookingId,
  canManage,
  currency,
  guestName,
  pending,
  refundDue,
}: StaffStayChangePanelProps) {
  const [transferVerified, setTransferVerified] = useState(false);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  if (!canManage) {
    return null;
  }

  return (
    <>
      {pending ? (
        <div className="staff-decide staff-decide--quiet staff-decide--prereq">
          <h3 className="staff-decide__title">Transfer to confirm</h3>
          <p className="staff-decide__summary" role="status">
            {guestName} wants to move to <strong>{pending.roomName}</strong>,{" "}
            {pending.dates} and says they sent{" "}
            <strong>{formatMoneySuffix(pending.balance, currency)}</strong>. The
            stay moves only after you confirm.
          </p>
          {confirmingDecline ? (
            <form action={declineStayChangeTransfer} className="staff-decide__form">
              <StaffFormBusyBridge />
              <input name="booking-id" type="hidden" value={bookingId} />
              <p className="detail-help">
                The stay stays as it is and the guest gets a message saying you
                couldn’t find the transfer.
              </p>
              <div className="staff-decide__actions">
                <button className="button button--danger" type="submit">
                  Keep the old stay
                </button>
                <button
                  className="button button--quiet"
                  onClick={() => setConfirmingDecline(false)}
                  type="button"
                >
                  Back
                </button>
              </div>
            </form>
          ) : (
            <form action={confirmStayChangeTransfer} className="staff-decide__form">
              <StaffFormBusyBridge />
              <input name="booking-id" type="hidden" value={bookingId} />
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
              <div className="staff-decide__actions">
                <button
                  className="button button--primary"
                  disabled={!transferVerified}
                  type="submit"
                >
                  Confirm transfer
                </button>
                <button
                  className="button button--quiet"
                  onClick={() => setConfirmingDecline(true)}
                  type="button"
                >
                  Transfer not received…
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {refundDue > 0 ? (
        <div className="staff-decide staff-decide--quiet staff-decide--prereq">
          <h3 className="staff-decide__title">Refund to send</h3>
          <p className="staff-decide__summary" role="status">
            {guestName} changed to a cheaper stay. Send them{" "}
            <strong>{formatMoneySuffix(refundDue, currency)}</strong> by bank
            transfer, then mark it sent. Ask for their account in the
            conversation if you don’t have it.
          </p>
          <form action={markStayChangeRefundSent} className="staff-decide__form">
            <StaffFormBusyBridge />
            <input name="booking-id" type="hidden" value={bookingId} />
            <input name="refund-amount" type="hidden" value={refundDue} />
            <div className="staff-decide__actions">
              <button className="button button--primary" type="submit">
                Mark refund sent
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
