"use client";

import type { PropertyCurrency } from "@/lib/currency";
import type { Locale } from "@/lib/i18n";
import type { BankTransferDetails } from "@/lib/bank-transfer";
import type { RoomPromotionRate } from "@/lib/pricing";
import type { Room } from "@/lib/content";
import { BookingRequest } from "@/components/booking-request";

export type BookingRequestLazyProps = {
  availabilityByRoomId: Record<string, number>;
  bankTransfer: BankTransferDetails;
  currency: PropertyCurrency;
  initialArrival?: string;
  initialDeparture?: string;
  initialLocale?: Locale;
  initialRoomId?: string;
  promotions: RoomPromotionRate[];
  rooms: Room[];
  stripePublishableKey: string | null;
};

export function BookingRequestLazy(props: BookingRequestLazyProps) {
  return <BookingRequest {...props} />;
}
