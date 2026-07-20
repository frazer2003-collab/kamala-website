export const STRIPE_BANK_CHARGE_RATE = 0.06;

export function resolveBookingStayTotal(booking: {
  depositAmount: number | null | undefined;
  estimatedTotal: number;
}) {
  return Math.max(0, Math.round(booking.depositAmount ?? booking.estimatedTotal));
}

export function calculateStripeChargeAmount(stayTotal: number) {
  const base = Math.max(0, Math.round(stayTotal));
  const totalDue = Math.max(1, Math.round(base * (1 + STRIPE_BANK_CHARGE_RATE)));
  const surcharge = totalDue - base;
  return { stayTotal: base, surcharge, totalDue };
}
