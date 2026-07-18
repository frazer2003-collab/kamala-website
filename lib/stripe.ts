import Stripe from "stripe";
import type { PropertyCurrency } from "@/lib/currency";
import { getStripeCurrencyCode } from "@/lib/currency";
import { STRIPE_BANK_CHARGE_RATE } from "@/lib/payment-pricing";
import { getSiteUrl } from "@/lib/site-url";

let stripeClient: Stripe | null = null;

export function hasStripeServerConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function hasStripeClientConfig() {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}

export function hasStripeConfig() {
  return hasStripeServerConfig() && hasStripeClientConfig();
}

export function getStripePublishableKey() {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }

  return key;
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}

export function getAppBaseUrl() {
  return getSiteUrl();
}

/** Full stay total charged at booking (no partial deposit). */
export function calculatePaymentAmount(totalAmount: number) {
  return Math.max(1, Math.round(totalAmount));
}

/** @deprecated Use calculatePaymentAmount — kept for call-site clarity during rename. */
export function calculateDepositAmount(totalAmount: number) {
  return calculatePaymentAmount(totalAmount);
}

/** Stripe currency minimums (major units). See Stripe docs: minimum charge amounts. */
export function getStripeMinimumChargeAmount(currency: PropertyCurrency) {
  return currency === "thb" ? 10 : 1;
}

type CreateDepositPaymentIntentInput = {
  bookingId: string;
  guestEmail: string;
  roomName: string;
  arrival: string;
  departure: string;
  depositAmount: number;
  stayTotal: number;
  surcharge: number;
  currency: PropertyCurrency;
  propertyName: string;
  hasPromotion: boolean;
};

export async function createDepositPaymentIntent({
  bookingId,
  guestEmail,
  roomName,
  arrival,
  departure,
  depositAmount,
  stayTotal,
  surcharge,
  currency,
  propertyName,
  hasPromotion,
}: CreateDepositPaymentIntentInput) {
  const stripe = getStripe();
  const description = hasPromotion
    ? `${arrival} to ${departure} · promotional rate · paid in full`
    : `${arrival} to ${departure} · paid in full`;

  const stripeCurrency = getStripeCurrencyCode(currency);

  return stripe.paymentIntents.create({
    amount: depositAmount * 100,
    currency: stripeCurrency,
    receipt_email: guestEmail,
    description: `${propertyName} stay — ${roomName}`,
    metadata: {
      booking_id: bookingId,
      room_name: roomName,
      stay_description: description,
      stay_total: String(stayTotal),
      bank_charge: String(surcharge),
      bank_charge_rate: String(STRIPE_BANK_CHARGE_RATE),
      payment_methods: "card",
    },
    payment_method_types: ["card"],
  });
}

export function getBookingConfirmedUrl(bookingId: string) {
  return `${getAppBaseUrl()}/booking/confirmed?booking_id=${encodeURIComponent(bookingId)}`;
}
