"use client";

import { useState } from "react";
import { refundClosedBooking } from "@/app/actions";
import {
  StaffBankChargeChoice,
  type BankChargeChoice,
} from "@/components/staff-bank-charge-choice";
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
};

export function StaffClosedRefundPanel({
  bookingId,
  canManage,
  currency,
  amount,
  paidByCard,
}: StaffClosedRefundPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [bankCharge, setBankCharge] = useState<BankChargeChoice>("keep");
  const amountLabel = formatMoneySuffix(amount, currency);

  return (
    <div className="staff-decide staff-decide--quiet">
      <h3 className="staff-decide__title">Refund this payment</h3>
      <p className="staff-decide__summary">
        {paidByCard
          ? `This stay is closed. Choose whether the guest pays the bank charge. You do not send a transfer. ${CARD_REFUND_GUEST_TIMING}`
          : `This stay is closed and ${amountLabel} was paid by bank transfer. Starting this emails staff to send it from the guesthouse bank account. The guest is told it is coming. ${BANK_REFUND_GUEST_TIMING}`}
      </p>
      {confirming ? (
        <form action={refundClosedBooking} className="staff-decide__form">
          <StaffFormBusyBridge />
          <input name="booking-id" type="hidden" value={bookingId} />
          {paidByCard ? (
            <StaffBankChargeChoice
              currency={currency}
              disabled={!canManage}
              onChange={setBankCharge}
              stayAmount={amount}
              value={bankCharge}
            />
          ) : null}
          <div className="staff-decide__actions">
            <button className="button button--primary" disabled={!canManage} type="submit">
              {paidByCard ? "Refund the card" : "Email the bank steps"}
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
            {paidByCard ? "Refund the card" : "Start the bank refund"}
          </button>
        </div>
      )}
      {!canManage ? (
        <p className="detail-help">Your account can view this stay but not refund it.</p>
      ) : null}
    </div>
  );
}
