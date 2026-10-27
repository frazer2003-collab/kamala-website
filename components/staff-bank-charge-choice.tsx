"use client";

import "@/app/calendar-cancel-reason.css";
import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import { calculateStripeChargeAmount } from "@/lib/payment-pricing";

export type BankChargeChoice = "keep" | "waive";

type StaffBankChargeChoiceProps = {
  currency: PropertyCurrency;
  disabled?: boolean;
  stayAmount: number;
  value: BankChargeChoice;
  onChange: (value: BankChargeChoice) => void;
};

export function StaffBankChargeChoice({
  currency,
  disabled = false,
  stayAmount,
  value,
  onChange,
}: StaffBankChargeChoiceProps) {
  const charge = calculateStripeChargeAmount(stayAmount);
  if (charge.surcharge <= 0) {
    return null;
  }
  const stayLabel = formatMoneySuffix(charge.stayTotal, currency);
  const feeLabel = formatMoneySuffix(charge.surcharge, currency);
  const fullLabel = formatMoneySuffix(charge.totalDue, currency);

  return (
    <fieldset className="calendar-cancel-reason">
      <legend>Bank charge</legend>
      <label className="calendar-cancel-reason__option">
        <input
          checked={value === "keep"}
          disabled={disabled}
          name="bank-charge"
          onChange={() => onChange("keep")}
          type="radio"
          value="keep"
        />
        <span>
          <strong>Refund with bank charge</strong>
          <span>
            Refund {stayLabel}. The {feeLabel} bank charge stays with the guesthouse.
          </span>
        </span>
      </label>
      <label className="calendar-cancel-reason__option">
        <input
          checked={value === "waive"}
          disabled={disabled}
          name="bank-charge"
          onChange={() => onChange("waive")}
          type="radio"
          value="waive"
        />
        <span>
          <strong>Refund without bank charge</strong>
          <span>Special case. Refund {fullLabel}, including the bank charge.</span>
        </span>
      </label>
    </fieldset>
  );
}
