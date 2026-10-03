"use server";

import { formatMoney } from "@/lib/currency";
import { describeStayChangeOutcome } from "@/lib/guest-stay-change";
import {
  applyPaidStayChange,
  applyStayChange,
  loadStayForChange,
  quoteStayChange,
  type ApplyStayChangeResult,
  type StayChangeTarget,
} from "@/lib/guest-stay-change-server";
import { getPropertySettings } from "@/lib/property-settings";
import { getStripe, hasStripeServerConfig } from "@/lib/stripe";

export type GuestStayChangeQuote =
  | {
      ok: true;
      nights: number;
      newTotal: number;
      kind: string;
      sentence: string;
      action: string;
      transferAmount: number | null;
    }
  | { ok: false; message: string };

async function loadEligibleStay(token: string) {
  const stay = await loadStayForChange(token);
  if (stay.status !== "ok" || !stay.eligibility.ok) {
    return null;
  }
  return stay.booking;
}

export async function quoteGuestStayChange(
  token: string,
  target: StayChangeTarget,
): Promise<GuestStayChangeQuote> {
  const booking = await loadEligibleStay(token);
  if (!booking) {
    return { ok: false, message: "This stay can’t be changed online. Message us instead." };
  }

  const quote = await quoteStayChange(booking, target);
  if (!quote.ok) {
    return quote;
  }

  const settings = await getPropertySettings();
  const copy = describeStayChangeOutcome(quote.outcome, (amount) =>
    formatMoney(amount, settings.currency),
  );
  return {
    ok: true,
    nights: quote.nights,
    newTotal: quote.newTotal,
    kind: quote.outcome.kind,
    sentence: copy.sentence,
    action: copy.action,
    transferAmount: quote.outcome.kind === "pay-bank" ? quote.outcome.difference : null,
  };
}

export async function submitGuestStayChange(
  token: string,
  target: StayChangeTarget,
  expectedTotal: number,
): Promise<ApplyStayChangeResult> {
  const booking = await loadEligibleStay(token);
  if (!booking) {
    return { ok: false, message: "This stay can’t be changed online. Message us instead." };
  }

  const quote = await quoteStayChange(booking, target);
  if (!quote.ok) {
    return quote;
  }
  if (quote.newTotal !== expectedTotal) {
    return {
      ok: false,
      message: "The price for these dates just changed. Check the new amount and try again.",
    };
  }

  return applyStayChange(booking, quote);
}

/** Runs after the card form succeeds (or Stripe redirects back) so the guest sees the result at once. */
export async function finishGuestCardStayChange(
  token: string,
  paymentIntentId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const stay = await loadStayForChange(token);
  if (stay.status !== "ok" || !paymentIntentId || !hasStripeServerConfig()) {
    return { ok: false, message: "We couldn’t confirm the payment. Message us and we’ll check." };
  }

  let intent;
  try {
    intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
  } catch {
    return { ok: false, message: "We couldn’t confirm the payment. Message us and we’ll check." };
  }

  if (intent.metadata?.stay_change_booking_id !== stay.booking.id) {
    return { ok: false, message: "We couldn’t confirm the payment. Message us and we’ll check." };
  }

  if (intent.status === "processing") {
    return { ok: false, message: "Your payment is still processing. We’ll update your stay as soon as it clears." };
  }

  const result = await applyPaidStayChange(intent);
  if (result.status === "applied" || result.status === "already-applied") {
    return { ok: true };
  }
  if (result.status === "refunded") {
    return {
      ok: false,
      message:
        "Someone booked those nights while you were paying, so your stay is unchanged and we refunded the payment to your card.",
    };
  }
  return { ok: false, message: "The payment didn’t go through. Your stay is unchanged." };
}
