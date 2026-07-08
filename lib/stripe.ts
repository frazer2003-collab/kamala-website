import Stripe from "stripe";
import type { PropertyCurrency } from "@/lib/currency";
import { getStripeCurrencyCode } from "@/lib/currency";

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
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function calculateDepositAmount(totalDollars: number) {
  return Math.max(1, Math.round(totalDollars * 0.5));
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
    ? `${arrival} to ${departure} · promotional rate · 50% deposit`
    : `${arrival} to ${departure} · 50% deposit`;

  return stripe.paymentIntents.create({
    amount: depositAmount * 100,
    currency: getStripeCurrencyCode(currency),
    receipt_email: guestEmail,
    description: `${propertyName} stay deposit — ${roomName}`,
    metadata: {
      booking_id: bookingId,
      room_name: roomName,
      stay_description: description,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

export function getBookingConfirmedUrl(bookingId: string) {
  return `${getAppBaseUrl()}/booking/confirmed?booking_id=${encodeURIComponent(bookingId)}`;
}
