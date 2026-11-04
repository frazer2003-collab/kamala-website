"use client";

import { useState } from "react";
import { refundClosedBooking } from "@/app/actions";
import { StaffBankChargeKeptNote } from "@/components/staff-bank-charge-choice";
import { StaffFormBusyBridge } from "@/components/staff-busy";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import {
  BANK_REFUND_GUEST_TIMING,
  CARD_REFUND_GUEST_TIMING,
} from "@/lib/refund-notice";

type StaffClosedRefundPanelProps = {
  bookingId: string;
  canManage: boolean;
  currency: PropertyCurrency;
  amount: number;
  paidByCard: boolean;
  /** Calendar cancel queued this stay for a Transfers refund. */
  queued?: boolean;
};

export function StaffClosedRefundPanel({
  bookingId,
  canManage,
  currency,
  amount,
  paidByCard,
  queued = false,
}: StaffClosedRefundPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const amountLabel = formatMoneySuffix(amount, currency);

  return (
    <div className="staff-decide staff-decide--quiet">
      <h3 className="staff-decide__title">
        {queued ? "Start the refund" : "Finish the refund"}
      </h3>
      <p className="staff-decide__summary">
        {queued
          ? paidByCard
            ? `This stay is off the calendar. Staff can refund ${amountLabel} with Stripe now — the 6% bank charge stays with the guesthouse. ${CARD_REFUND_GUEST_TIMING}`
            : `This stay is off the calendar. Owner sends ${amountLabel} Thai bank / QR from the guesthouse account. Starting this emails the bank steps. ${BANK_REFUND_GUEST_TIMING}`
          : paidByCard
            ? `This stay was cancelled and still needs a Stripe refund. Staff can send ${amountLabel} back now; the bank charge stays with the guesthouse. ${CARD_REFUND_GUEST_TIMING}`
            : `This stay was cancelled and ${amountLabel} still needs sending as Thai bank / QR by the owner. ${BANK_REFUND_GUEST_TIMING}`}
      </p>
      {confirming ? (
        <form action={refundClosedBooking} className="staff-decide__form">
          <StaffFormBusyBridge />
          <input name="booking-id" type="hidden" value={bookingId} />
          {paidByCard ? (
            <StaffBankChargeKeptNote currency={currency} stayAmount={amount} />
          ) : null}
          <div className="staff-decide__actions">
            <button className="button button--primary" disabled={!canManage} type="submit">
              {paidByCard ? "Refund with Stripe" : "Email owner bank steps"}
            </button>
            <button
              className="button button--quiet"
              onClick={() => setConfirming(false)}
              type="button"
            >
              Back
            </button>
          </div>
        </form>
      ) : (
        <div className="staff-decide__actions">
          <button
            className="button button--secondary"
            disabled={!canManage}
            onClick={() => setConfirming(true)}
            type="button"
          >
            {paidByCard ? "Refund with Stripe" : "Start Thai bank / QR refund"}
          </button>
        </div>
      )}
      {!canManage ? (
        <p className="detail-help">Your account can view this stay but not refund it.</p>
      ) : null}
    </div>
  );
}
