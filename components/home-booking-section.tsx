"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  SELECT_ROOM_EVENT,
  SELECT_ROOM_STORAGE_KEY,
  type SelectRoomDetail,
} from "@/components/book-room-link";
import type { PropertyCurrency } from "@/lib/currency";
import type { Locale } from "@/lib/i18n";
import type { RoomPromotionRate } from "@/lib/pricing";
import type { Room } from "@/lib/content";
import type { BankTransferDetails } from "@/lib/bank-transfer";
import { buildBookingPaymentNote } from "@/lib/property-brand";
import { buildBookingSectionHeading } from "@/lib/home-hero-copy";
import { t } from "@/lib/i18n";

const BookingRequest = dynamic(
  () =>
    import("@/components/booking-request-lazy").then((module) => module.BookingRequestLazy),
  {
        loading: () => (
      <div
        className="booking-panel booking-panel--loading booking-panel--loading-checkout"
        id="booking"
        aria-busy="true"
        aria-live="polite"
      >
        <ol className="booking-progress booking-progress--placeholder" aria-hidden="true">
          <li className="booking-progress__step booking-progress__step--current">
            <span className="booking-progress__marker">1</span>
            <span className="booking-progress__label">Your stay</span>
          </li>
          <li className="booking-progress__step">
            <span className="booking-progress__marker">2</span>
            <span className="booking-progress__label">Guest details</span>
          </li>
          <li className="booking-progress__step">
            <span className="booking-progress__marker">3</span>
            <span className="booking-progress__label">Pay in full</span>
          </li>
        </ol>
        <p>{t("en", "startingCheckout")}</p>
      </div>
    ),
  },
);

type HomeBookingSectionProps = {
  allowPayOnArrival: boolean;
  addressLine?: string | null;
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

function readStoredSelection(): SelectRoomDetail | null {
  try {
    const raw = sessionStorage.getItem(SELECT_ROOM_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const detail = JSON.parse(raw) as SelectRoomDetail;
    return detail.roomId ? detail : null;
  } catch {
    return null;
  }
}

export function HomeBookingSection({
  allowPayOnArrival,
  addressLine = null,
  bankTransfer,
  initialRoomId,
  initialArrival,
  initialDeparture,
  stripePublishableKey,
  ...bookingProps
}: HomeBookingSectionProps) {
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [selectedArrival, setSelectedArrival] = useState(initialArrival);
  const [selectedDeparture, setSelectedDeparture] = useState(initialDeparture);

  useEffect(() => {
    if (initialRoomId) {
      return;
    }

    const stored = readStoredSelection();
    if (stored) {
      setSelectedRoomId(stored.roomId);
      setSelectedArrival(stored.arrival);
      setSelectedDeparture(stored.departure);
    }

    function handleSelect(event: Event) {
      const detail = (event as CustomEvent<SelectRoomDetail>).detail;
      if (!detail?.roomId) {
        return;
      }

      setSelectedRoomId(detail.roomId);
      setSelectedArrival(detail.arrival);
      setSelectedDeparture(detail.departure);
    }

    window.addEventListener(SELECT_ROOM_EVENT, handleSelect);
    return () => window.removeEventListener(SELECT_ROOM_EVENT, handleSelect);
  }, [initialRoomId]);

  if (!selectedRoomId) {
    const paymentNote = buildBookingPaymentNote(
      allowPayOnArrival,
      Boolean(stripePublishableKey),
    );

    return (
      <section
        className="section section--booking booking-panel--prompt"
        id="booking"
        aria-labelledby="booking-prompt-title"
      >
        <h2 id="booking-prompt-title">{buildBookingSectionHeading(addressLine)}</h2>
        <p>
          Set your dates above, choose a room, then select <strong>Reserve</strong>. The
          booking form opens here — we reply within a day to confirm your stay.
        </p>
        <p className="booking-panel__payment-note">{paymentNote}</p>
      </section>
    );
  }

  return (
    <BookingRequest
      {...bookingProps}
      bankTransfer={bankTransfer}
      initialArrival={selectedArrival ?? initialArrival}
      initialDeparture={selectedDeparture ?? initialDeparture}
      initialRoomId={selectedRoomId}
      stripePublishableKey={stripePublishableKey}
    />
  );
}
