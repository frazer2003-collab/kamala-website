"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelPendingBooking,
  createBookingRequest,
  type BookingActionState,
  type BookingFormValues,
  type BookingQuoteResult,
} from "@/app/actions";
import { BookingPaymentElement } from "@/components/booking-payment-element";
import {
  SELECT_ROOM_EVENT,
  SELECT_ROOM_STORAGE_KEY,
  type SelectRoomDetail,
} from "@/components/book-room-link";
import type { Room } from "@/lib/content";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { calculateStayQuote, type RoomPromotionRate } from "@/lib/pricing";
import { getRoomAvailabilityLabel, isRoomBookable } from "@/lib/room-availability";
import { getBookingPaymentReturnUrl } from "@/lib/booking-payment-url";

const initialState: BookingActionState = {
  status: "idle",
  message: "",
};

function SubmitButton({
  disabled,
  deposit,
  currency,
  locale,
  paymentStep,
}: {
  disabled: boolean;
  deposit: number;
  currency: PropertyCurrency;
  locale: Locale;
  paymentStep: boolean;
}) {
  const { pending } = useFormStatus();
  const label = pending
    ? t(locale, "startingCheckout")
    : paymentStep
      ? `${t(locale, "payDeposit")} (${formatMoney(deposit, currency)})`
      : t(locale, "continueToPayment");

  return (
    <button className="button button--primary" type="submit" disabled={pending || disabled}>
      {label}
    </button>
  );
}

function getRoomAvailableCount(room: Room, availabilityByRoomId?: Record<string, number>) {
  if (availabilityByRoomId && room.id in availabilityByRoomId) {
    return availabilityByRoomId[room.id];
  }

  return room.availableCount;
}

function getDefaultRoomId(rooms: Room[], availabilityByRoomId?: Record<string, number>) {
  return (
    rooms.find((room) => isRoomBookable(getRoomAvailableCount(room, availabilityByRoomId)))?.id ??
    rooms[0].id
  );
}

function getInitialRoomId(
  rooms: Room[],
  preferredRoomId: string | undefined,
  availabilityByRoomId?: Record<string, number>,
) {
  if (
    preferredRoomId &&
    rooms.some(
      (room) =>
        room.id === preferredRoomId &&
        isRoomBookable(getRoomAvailableCount(room, availabilityByRoomId)),
    )
  ) {
    return preferredRoomId;
  }

  return getDefaultRoomId(rooms, availabilityByRoomId);
}

function emptyFormFields(
  roomId: string,
  arrival = "",
  departure = "",
): BookingFormValues {
  return {
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomId,
    arrival,
    departure,
    note: "",
  };
}

function emptyDisplayQuote(baseRate: number): BookingQuoteResult {
  return {
    nights: 0,
    total: 0,
    baseTotal: 0,
    promoNights: 0,
    hasPromotion: false,
    baseNightlyRate: baseRate,
    effectiveNightlyRate: null,
    promoLabel: null,
  };
}

function hasValidStayDates(arrival: string, departure: string) {
  return Boolean(arrival && departure && departure > arrival);
}

export function BookingRequest({
  rooms,
  promotions,
  initialRoomId,
  initialArrival,
  initialDeparture,
  availabilityByRoomId,
  currency,
  initialLocale = "en",
  stripePublishableKey,
}: {
  rooms: Room[];
  promotions: RoomPromotionRate[];
  initialRoomId?: string;
  initialArrival?: string;
  initialDeparture?: string;
  availabilityByRoomId?: Record<string, number>;
  currency: PropertyCurrency;
  initialLocale?: Locale;
  stripePublishableKey: string | null;
}) {
  const initialRoom = getInitialRoomId(rooms, initialRoomId, availabilityByRoomId);
  const [locale, setLocale] = useState<Locale>(
    isLocale(initialLocale) ? initialLocale : "en",
  );
  const [fields, setFields] = useState<BookingFormValues>(() =>
    emptyFormFields(initialRoom, initialArrival ?? "", initialDeparture ?? ""),
  );
  const [state, formAction] = useActionState(createBookingRequest, initialState);
  const [paymentStep, setPaymentStep] = useState<{
    bookingId: string;
    clientSecret: string;
  } | null>(null);
  const [isCancelingPayment, startCancelPayment] = useTransition();

  useEffect(() => {
    if (state.status === "payment_ready" && state.payment) {
      setPaymentStep(state.payment);
      return;
    }

    if (state.status === "error") {
      setPaymentStep(null);
    }
  }, [state.payment, state.status]);

  useEffect(() => {
    if (state.values) {
      setFields(state.values);
    }
  }, [state.values]);

  useEffect(() => {
    function applyRoomSelection(detail: SelectRoomDetail) {
      const room = rooms.find((entry) => entry.id === detail.roomId);
      if (room && isRoomBookable(getRoomAvailableCount(room, availabilityByRoomId))) {
        setFields((current) => ({
          ...current,
          roomId: detail.roomId,
          arrival: detail.arrival ?? current.arrival,
          departure: detail.departure ?? current.departure,
        }));
      }
    }

    function handleSelectRoom(event: Event) {
      applyRoomSelection((event as CustomEvent<SelectRoomDetail>).detail);
    }

    try {
      const stored = sessionStorage.getItem(SELECT_ROOM_STORAGE_KEY);
      if (stored) {
        sessionStorage.removeItem(SELECT_ROOM_STORAGE_KEY);
        applyRoomSelection(JSON.parse(stored) as SelectRoomDetail);
      }
    } catch {
      // Ignore storage errors.
    }

    window.addEventListener(SELECT_ROOM_EVENT, handleSelectRoom);
    return () => window.removeEventListener(SELECT_ROOM_EVENT, handleSelectRoom);
  }, [availabilityByRoomId, rooms]);

  useEffect(() => {
    const selected = rooms.find((room) => room.id === fields.roomId);
    if (
      selected &&
      !isRoomBookable(getRoomAvailableCount(selected, availabilityByRoomId))
    ) {
      setFields((current) => ({
        ...current,
        roomId: getDefaultRoomId(rooms, availabilityByRoomId),
      }));
    }
  }, [availabilityByRoomId, fields.roomId, rooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === fields.roomId) ?? rooms[0],
    [fields.roomId, rooms],
  );
  const roomIsFull = !isRoomBookable(
    getRoomAvailableCount(selectedRoom, availabilityByRoomId),
  );
  const bookableRooms = useMemo(
    () =>
      rooms.filter((room) =>
        isRoomBookable(getRoomAvailableCount(room, availabilityByRoomId)),
      ),
    [availabilityByRoomId, rooms],
  );

  const clientQuote = useMemo(() => {
    if (!hasValidStayDates(fields.arrival, fields.departure)) {
      return emptyDisplayQuote(selectedRoom.rate);
    }

    const calculated = calculateStayQuote({
      roomId: selectedRoom.id,
      baseRate: selectedRoom.rate,
      arrival: fields.arrival,
      departure: fields.departure,
      promotions,
    });

    return {
      ...calculated,
      baseNightlyRate: selectedRoom.rate,
      effectiveNightlyRate:
        calculated.nights > 0 ? Math.round(calculated.total / calculated.nights) : null,
      promoLabel: calculated.hasPromotion
        ? promotions.find(
            (promotion) =>
              promotion.roomId === selectedRoom.id && promotion.label,
          )?.label ??
          `${Math.round(((calculated.baseTotal - calculated.total) / calculated.baseTotal) * 100)}% off`
        : null,
    };
  }, [fields.arrival, fields.departure, promotions, selectedRoom.id, selectedRoom.rate]);

  const displayQuote = hasValidStayDates(fields.arrival, fields.departure)
    ? clientQuote
    : emptyDisplayQuote(selectedRoom.rate);
  const nights = displayQuote.nights > 0 ? displayQuote.nights : 1;
  const estimate = displayQuote.nights > 0 ? displayQuote.total : selectedRoom.rate;
  const deposit = Math.max(1, Math.round(estimate * 0.5));
  const showPromoPricing =
    displayQuote.hasPromotion && displayQuote.baseTotal > displayQuote.total;
  const paymentReturnUrl = paymentStep
    ? getBookingPaymentReturnUrl(paymentStep.bookingId)
    : "";

  function handleCancelPayment() {
    if (!paymentStep) {
      return;
    }

    const bookingId = paymentStep.bookingId;
    startCancelPayment(async () => {
      await cancelPendingBooking(bookingId);
      setPaymentStep(null);
    });
  }

  return (
    <section className="booking-panel" aria-labelledby="booking-title" id="booking">
      <div className="booking-panel__intro">
        <div className="booking-panel__intro-top">
          <p className="section-note">{t(locale, "requestStay")}</p>
          <label className="language-toggle" htmlFor="booking-locale">
            <span className="sr-only">{t(locale, "language")}</span>
            <select
              id="booking-locale"
              onChange={(event) => {
                if (isLocale(event.target.value)) {
                  setLocale(event.target.value);
                }
              }}
              value={locale}
            >
              <option value="en">English</option>
              <option value="th">ไทย</option>
            </select>
          </label>
        </div>
        <h2 id="booking-title">Request your stay</h2>
        <p>
          A 50% deposit holds your room. Staff confirm every booking and email
          arrival details. The balance is due before check-in.
        </p>
      </div>

      <form className="booking-form" action={formAction}>
        <fieldset className="booking-form__fields" disabled={Boolean(paymentStep)}>
        <div className="field-pair">
          <label htmlFor="guest-name">{t(locale, "guestName")}</label>
          <input
            id="guest-name"
            name="guest-name"
            type="text"
            autoComplete="name"
            value={fields.guestName}
            onChange={(event) =>
              setFields((current) => ({ ...current, guestName: event.target.value }))
            }
            aria-describedby={
              state.fieldErrors?.["guest-name"] ? "guest-name-error" : undefined
            }
            required
          />
          {state.fieldErrors?.["guest-name"] ? (
            <span className="field-error" id="guest-name-error">
              {state.fieldErrors["guest-name"]}
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="guest-email">
            {t(locale, "guestEmail")} <span className="field-required">Required</span>
          </label>
          <input
            id="guest-email"
            name="guest-email"
            type="email"
            autoComplete="email"
            value={fields.guestEmail}
            onChange={(event) =>
              setFields((current) => ({ ...current, guestEmail: event.target.value }))
            }
            aria-describedby={
              state.fieldErrors?.["guest-email"] ? "guest-email-error" : undefined
            }
            required
          />
          {state.fieldErrors?.["guest-email"] ? (
            <span className="field-error" id="guest-email-error">
              {state.fieldErrors["guest-email"]}
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="guest-phone">
            {t(locale, "guestPhone")} <span className="field-required">Required</span>
          </label>
          <input
            id="guest-phone"
            name="guest-phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            value={fields.guestPhone}
            onChange={(event) =>
              setFields((current) => ({ ...current, guestPhone: event.target.value }))
            }
            aria-describedby={
              state.fieldErrors?.["guest-phone"] ? "guest-phone-error" : undefined
            }
            placeholder="Include country code if outside the UK"
            required
          />
          {state.fieldErrors?.["guest-phone"] ? (
            <span className="field-error" id="guest-phone-error">
              {state.fieldErrors["guest-phone"]}
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="arrival">{t(locale, "arrival")}</label>
          <input
            id="arrival"
            name="arrival"
            type="date"
            value={fields.arrival}
            onChange={(event) =>
              setFields((current) => ({ ...current, arrival: event.target.value }))
            }
            aria-describedby={state.fieldErrors?.arrival ? "arrival-error" : undefined}
            required
          />
          {state.fieldErrors?.arrival ? (
            <span className="field-error" id="arrival-error">
              {state.fieldErrors.arrival}
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="departure">{t(locale, "departure")}</label>
          <input
            id="departure"
            name="departure"
            type="date"
            value={fields.departure}
            onChange={(event) =>
              setFields((current) => ({ ...current, departure: event.target.value }))
            }
            aria-describedby={
              state.fieldErrors?.departure ? "departure-error" : undefined
            }
            required
          />
          {state.fieldErrors?.departure ? (
            <span className="field-error" id="departure-error">
              {state.fieldErrors.departure}
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="room">{t(locale, "room")}</label>
          <select
            id="room"
            name="room"
            value={fields.roomId}
            onChange={(event) => {
              setFields((current) => ({ ...current, roomId: event.target.value }));
            }}
            aria-describedby={state.fieldErrors?.room ? "room-error" : undefined}
          >
            {rooms.map((room) => {
              const availableCount = getRoomAvailableCount(room, availabilityByRoomId);
              const isSelected = room.id === fields.roomId;
              const roomLabel =
                isSelected && showPromoPricing && displayQuote.effectiveNightlyRate
                  ? `${room.name} · ${formatMoney(displayQuote.effectiveNightlyRate, currency)}/night promo (was ${formatMoney(room.rate, currency)})`
                  : `${room.name} · ${formatMoney(room.rate, currency)}/night`;

              return (
              <option
                key={room.id}
                disabled={!isRoomBookable(availableCount)}
                value={room.id}
              >
                {roomLabel}
                {!isRoomBookable(availableCount) ? " · FULL" : ""}
              </option>
              );
            })}
          </select>
          {state.fieldErrors?.room ? (
            <span className="field-error" id="room-error">
              {state.fieldErrors.room}
            </span>
          ) : roomIsFull ? (
            <span className="field-error" id="room-full-error">
              This room is full. Choose another room to send a request.
            </span>
          ) : null}
        </div>
        <div className="field-pair">
          <label htmlFor="nights">Nights</label>
          <input
            id="nights"
            inputMode="numeric"
            type="number"
            value={nights}
            readOnly
            aria-label="Calculated nights"
          />
        </div>
        <div className="field-pair field-pair--wide">
          <label htmlFor="guest-note">{t(locale, "guestNote")}</label>
          <textarea
            id="guest-note"
            name="guest-note"
            rows={4}
            value={fields.note}
            onChange={(event) =>
              setFields((current) => ({ ...current, note: event.target.value }))
            }
            placeholder="Arrival time, breakfast needs, or questions about the room."
          />
        </div>

        <div className="booking-summary" aria-live="polite">
          <div className="booking-summary__row">
            <span className="booking-summary__label">{t(locale, "estimatedTotal")}</span>
            {hasValidStayDates(fields.arrival, fields.departure) ? (
              showPromoPricing ? (
                <div className="booking-summary__price">
                  <span className="booking-summary__was">
                    {formatMoney(displayQuote.baseTotal, currency)}
                  </span>
                  <strong>{formatMoney(estimate, currency)}</strong>
                  <span className="booking-summary__promo">
                    {displayQuote.promoLabel ?? "Promotional rate"}
                  </span>
                </div>
              ) : (
                <strong>{formatMoney(estimate, currency)}</strong>
              )
            ) : (
              <p className="booking-summary__hint">
                Choose arrival and departure to see your total, including any
                promotional rates.
              </p>
            )}
          </div>
          <div className="booking-summary__row">
            <span className="booking-summary__label">{t(locale, "depositDue")}</span>
            <strong>{formatMoney(deposit, currency)}</strong>
          </div>
          <p>
            {selectedRoom.name} · {selectedRoom.sleeps} ·{" "}
            {getRoomAvailabilityLabel(
              getRoomAvailableCount(selectedRoom, availabilityByRoomId),
            )}.
            {showPromoPricing
              ? ` Promotional pricing applies to ${displayQuote.promoNights} of ${nights} night${nights === 1 ? "" : "s"}.`
              : hasValidStayDates(fields.arrival, fields.departure)
                ? ""
                : ` Standard rate is ${formatMoney(selectedRoom.rate, currency)}/night.`}
          </p>
        </div>
        </fieldset>

        {bookableRooms.length === 0 ? (
          <p className="form-message form-message--error" role="alert">
            All rooms are currently full. Please check back later or contact staff
            directly.
          </p>
        ) : null}

        {state.status === "error" ? (
          <p className="form-message form-message--error" role="alert">
            {state.message}
          </p>
        ) : null}

        {!paymentStep ? (
          <SubmitButton
            currency={currency}
            deposit={deposit}
            disabled={roomIsFull || bookableRooms.length === 0}
            locale={locale}
            paymentStep={false}
          />
        ) : null}

        {paymentStep && stripePublishableKey ? (
          <BookingPaymentElement
            bookingId={paymentStep.bookingId}
            clientSecret={paymentStep.clientSecret}
            currency={currency}
            deposit={deposit}
            locale={locale}
            onCancel={handleCancelPayment}
            publishableKey={stripePublishableKey}
            returnUrl={paymentReturnUrl}
          />
        ) : null}

        {paymentStep && !stripePublishableKey ? (
          <p className="form-message form-message--error" role="alert">
            Card payments are not configured yet. Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.
          </p>
        ) : null}

        {isCancelingPayment ? (
          <p className="booking-summary__hint" aria-live="polite">
            {t(locale, "startingCheckout")}
          </p>
        ) : null}
      </form>
    </section>
  );
}
