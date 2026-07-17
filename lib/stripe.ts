import Stripe from "stripe";
import type { PropertyCurrency } from "@/lib/currency";
import { getStripeCurrencyCode } from "@/lib/currency";
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

type CreateDepositPaymentIntentInput = {
  bookingId: string;
  guestEmail: string;
  roomName: string;
  arrival: string;
  departure: string;
  depositAmount: number;
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
  currency,
  propertyName,
  hasPromotion,
}: CreateDepositPaymentIntentInput) {
  const stripe = getStripe();
  const description = hasPromotion
    ? `${arrival} to ${departure} · promotional rate · paid in full`
    : `${arrival} to ${departure} · paid in full`;

  const stripeCurrency = getStripeCurrencyCode(currency);

  // THB: card + PromptPay (Thai QR). USD: card only.
  // PromptPay must be enabled in the Stripe Dashboard for the account.
  const paymentMethodTypes =
    stripeCurrency === "thb" ? (["card", "promptpay"] as const) : (["card"] as const);

  return stripe.paymentIntents.create({
    amount: depositAmount * 100,
    currency: stripeCurrency,
    receipt_email: guestEmail,
    description: `${propertyName} stay — ${roomName}`,
    metadata: {
      booking_id: bookingId,
      room_name: roomName,
      stay_description: description,
      payment_methods: paymentMethodTypes.join(","),
    },
    payment_method_types: [...paymentMethodTypes],
  });
}

export function getBookingConfirmedUrl(bookingId: string) {
  return `${getAppBaseUrl()}/booking/confirmed?booking_id=${encodeURIComponent(bookingId)}`;
}
