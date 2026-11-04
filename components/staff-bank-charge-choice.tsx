import { formatMoneySuffix, type PropertyCurrency } from "@/lib/currency";
import { calculateStripeChargeAmount } from "@/lib/payment-pricing";

type StaffBankChargeKeptNoteProps = {
  currency: PropertyCurrency;
  stayAmount: number;
};

/**
 * Card refunds always return the stay total only. The 6% Stripe bank charge
 * stays with the guesthouse so fees are not refunded away as profit.
 */
export function StaffBankChargeKeptNote({
  currency,
  stayAmount,
}: StaffBankChargeKeptNoteProps) {
  const charge = calculateStripeChargeAmount(stayAmount);
  if (charge.surcharge <= 0) {
    return null;
  }
  const stayLabel = formatMoneySuffix(charge.stayTotal, currency);
  const feeLabel = formatMoneySuffix(charge.surcharge, currency);

  return (
    <p className="detail-help" role="note">
      Refunds {stayLabel} to the card. The {feeLabel} bank charge stays with the
      guesthouse.
    </p>
  );
}

/** @deprecated Prefer StaffBankChargeKeptNote — waive is no longer offered. */
export const StaffBankChargeChoice = StaffBankChargeKeptNote;
