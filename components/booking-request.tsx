"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  cancelPendingBooking,
  createBookingRequest,
  getBookingQuote,
  type BookingActionState,
  type BookingFormValues,
  type BookingQuoteResult,
} from "@/app/actions";
import { BookingPaymentElement } from "@/components/booking-payment-element";
import { BookingProgress } from "@/components/booking-progress";
import {
  SELECT_ROOM_EVENT,
  SELECT_ROOM_STORAGE_KEY,
  type SelectRoomDetail,
} from "@/components/book-room-link";
import type { Room } from "@/lib/content";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { GUEST_LOCALE_COOKIE } from "@/lib/guest-locale-cookie";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { calculateStayQuote, type RoomPromotionRate } from "@/lib/pricing";
import { getRoomAvailabilityLabel, isRoomBookable } from "@/lib/room-availability";
import { getBookingPaymentReturnUrl } from "@/lib/booking-payment-url";
import type { BankTransferDetails } from "@/lib/bank-transfer";
import {
  defaultBedSetupForRoom,
  roomOffersBedSetupChoice,
} from "@/lib/bed-setup";

function persistGuestLocale(nextLocale: Locale) {
  try {
    document.cookie = `${GUEST_LOCALE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Ignore cookie errors in restricted contexts.
  }
}

function formatStayDate(value: string, locale: Locale) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const initialState: BookingActionState = {
  status: "idle",
  message: "",
};

function QuoteAmount({
  amount,
  currency,
  className = "",
  as: Tag = "span",
}: {
  amount: number;
  currency: PropertyCurrency;
  className?: string;
  as?: "span" | "strong";
}) {
  return (
    <Tag key={amount} className={`quote-amount ${className}`.trim()}>
      {formatMoney(amount, currency)}
    </Tag>
  );
}

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
    bedSetup: defaultBedSetupForRoom(roomId),
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
  bankTransfer,
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
  bankTransfer: BankTransferDetails;
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

  useEffect(() => {
    persistGuestLocale(locale);
  }, [locale]);
  const [fields, setFields] = useState<BookingFormValues>(() =>
    emptyFormFields(initialRoom, initialArrival ?? "", initialDeparture ?? ""),
  );
  const [state, formAction] = useActionState(createBookingRequest, initialState);
  const [paymentStep, setPaymentStep] = useState<{
    bookingId: string;
    conversationToken: string;
    clientSecret: string | null;
    stayTotal: number;
    cardTotalDue: number;
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
          bedSetup: defaultBedSetupForRoom(detail.roomId),
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
      setFields((current) => {
        const nextRoomId = getDefaultRoomId(rooms, availabilityByRoomId);
        return {
          ...current,
          roomId: nextRoomId,
          bedSetup: defaultBedSetupForRoom(nextRoomId),
        };
      });
    }
  }, [availabilityByRoomId, fields.roomId, rooms]);

  useEffect(() => {
    setFields((current) => {
      const nextBedSetup = defaultBedSetupForRoom(current.roomId);
      if (!roomOffersBedSetupChoice(current.roomId)) {
        return current.bedSetup === "" ? current : { ...current, bedSetup: "" };
      }
      if (current.bedSetup === "double" || current.bedSetup === "twin") {
        return current;
      }
      return { ...current, bedSetup: nextBedSetup };
    });
  }, [fields.roomId]);

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

  const [serverQuote, setServerQuote] = useState<BookingQuoteResult | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!hasValidStayDates(fields.arrival, fields.departure)) {
      setServerQuote(null);
      setQuotePending(false);
      setQuoteFailed(false);
      return;
    }

    let cancelled = false;
    setQuotePending(true);
    setQuoteFailed(false);

    void getBookingQuote(selectedRoom.id, fields.arrival, fields.departure)
      .then((quote) => {
        if (!cancelled) {
          setServerQuote(quote);
          setQuotePending(false);
          setQuoteFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerQuote(null);
          setQuotePending(false);
          setQuoteFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fields.arrival, fields.departure, selectedRoom.id]);

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

  const displayQuote =
    hasValidStayDates(fields.arrival, fields.departure) && serverQuote && serverQuote.nights > 0
      ? serverQuote
      : hasValidStayDates(fields.arrival, fields.departure)
        ? clientQuote
        : emptyDisplayQuote(selectedRoom.rate);
  const nights = displayQuote.nights > 0 ? displayQuote.nights : 1;
  const estimate = displayQuote.nights > 0 ? displayQuote.total : selectedRoom.rate;
  const deposit = Math.max(1, Math.round(estimate));
  const showPromoPricing =
    displayQuote.hasPromotion && displayQuote.baseTotal > displayQuote.total;
  const hasDates = hasValidStayDates(fields.arrival, fields.departure);
  const paymentReturnUrl = paymentStep
    ? getBookingPaymentReturnUrl(paymentStep.bookingId, locale)
    : "";
  const showSeparateDueLine = hasDates && deposit !== estimate;
  const progressStep: 1 | 2 | 3 = paymentStep ? 3 : hasDates ? 2 : 1;
  const nightlyRate =
    displayQuote.effectiveNightlyRate ?? selectedRoom.rate;
  const promoSavings = showPromoPricing
    ? displayQuote.baseTotal - displayQuote.total
    : 0;

  function handleCancelPayment() {
    if (!paymentStep) {
      return;
    }

    const bookingId = paymentStep.bookingId;
    const conversationToken = paymentStep.conversationToken;
    startCancelPayment(async () => {
      await cancelPendingBooking(bookingId, conversationToken);
      setPaymentStep(null);
    });
  }

  return (
    <section
      className={`booking-panel${paymentStep ? " booking-panel--payment" : ""}`}
      aria-labelledby="booking-title"
      id="booking"
    >
      <div className="booking-panel__intro">
        <div className="booking-panel__intro-top">
          <BookingProgress locale={locale} step={progressStep} />
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
        <h2 id="booking-title">
          {paymentStep
            ? t(locale, "completeReservation")
            : t(locale, "requestStayTitle")}
        </h2>
        <p>
          {paymentStep
            ? t(locale, "bookingIntroPayment")
            : t(locale, "bookingIntro")}
        </p>
      </div>

      <div className="booking-panel__main">
      {!isOnline ? (
        <p className="form-message form-message--error" role="alert">
          {t(locale, "offlineBanner")}
        </p>
      ) : null}
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
            aria-invalid={Boolean(state.fieldErrors?.["guest-name"]) || undefined}
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
            {t(locale, "guestEmail")}{" "}
            <span className="field-required">{t(locale, "required")}</span>
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
            aria-invalid={Boolean(state.fieldErrors?.["guest-email"]) || undefined}
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
            {t(locale, "guestPhone")}{" "}
            <span className="field-required">{t(locale, "required")}</span>
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
            aria-invalid={Boolean(state.fieldErrors?.["guest-phone"]) || undefined}
            placeholder={t(locale, "phonePlaceholder")}
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
              const nextRoomId = event.target.value;
              setFields((current) => ({
                ...current,
                roomId: nextRoomId,
                bedSetup: defaultBedSetupForRoom(nextRoomId),
              }));
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
                {!isRoomBookable(availableCount) ? t(locale, "roomFullSuffix") : ""}
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
              {t(locale, "roomFull")}
            </span>
          ) : null}
        </div>
        {roomOffersBedSetupChoice(fields.roomId) ? (
          <div className="field-pair">
            <label htmlFor="bed-setup">{t(locale, "beds")}</label>
            <select
              id="bed-setup"
              name="bed-setup"
              value={fields.bedSetup || "double"}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  bedSetup: event.target.value,
                }))
              }
              aria-describedby={
                state.fieldErrors?.["bed-setup"]
                  ? "bed-setup-error"
                  : "bed-setup-help"
              }
              aria-invalid={Boolean(state.fieldErrors?.["bed-setup"]) || undefined}
              required
            >
              <option value="double">{t(locale, "bedDouble")}</option>
              <option value="twin">{t(locale, "bedTwin")}</option>
            </select>
            {state.fieldErrors?.["bed-setup"] ? (
              <span className="field-error" id="bed-setup-error">
                {state.fieldErrors["bed-setup"]}
              </span>
            ) : (
              <span className="field-help" id="bed-setup-help">
                {t(locale, "bedsHelp")}
              </span>
            )}
          </div>
        ) : null}
        <div className="field-pair">
          <label htmlFor="nights">{t(locale, "nights")}</label>
          <input
            id="nights"
            inputMode="numeric"
            type="number"
            value={nights}
            readOnly
            aria-label={t(locale, "nightsAria")}
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
            placeholder={t(locale, "notePlaceholder")}
          />
        </div>

        <div className="booking-summary booking-summary--receipt" aria-live="polite">
          {quotePending && hasDates ? (
            <p className="booking-summary__quote-status">{t(locale, "confirmingQuote")}</p>
          ) : null}
          {quoteFailed && hasDates && !quotePending ? (
            <p className="form-message form-message--error" role="status">
              {t(locale, "quoteUnavailable")}
            </p>
          ) : null}
          {hasDates ? (
            <>
              <div className="booking-receipt__lines">
                <div className="booking-receipt__line">
                  <span>
                    {nights} {t(locale, "nightsLine")}{" "}
                    {formatMoney(nightlyRate, currency)}/night
                  </span>
                  <QuoteAmount
                    amount={showPromoPricing ? displayQuote.baseTotal : estimate}
                    className="booking-receipt__value"
                    currency={currency}
                  />
                </div>
                {showPromoPricing ? (
                  <div className="booking-receipt__line booking-receipt__line--promo">
                    <span>{displayQuote.promoLabel ?? t(locale, "promoSavings")}</span>
                    <QuoteAmount
                      amount={-promoSavings}
                      className="booking-receipt__value booking-receipt__value--promo"
                      currency={currency}
                    />
                  </div>
                ) : null}
              </div>
              <div className="booking-receipt__divider" aria-hidden="true" />
              {showSeparateDueLine ? (
                <div className="booking-receipt__line booking-receipt__line--total">
                  <span className="booking-summary__label">
                    {t(locale, "estimatedTotal")}
                  </span>
                  <QuoteAmount
                    amount={estimate}
                    as="strong"
                    className="booking-receipt__total"
                    currency={currency}
                  />
                </div>
              ) : null}
              <div className="booking-receipt__line booking-receipt__line--deposit">
                <span className="booking-summary__label">{t(locale, "depositDue")}</span>
                <QuoteAmount
                  amount={deposit}
                  as="strong"
                  className="booking-receipt__deposit"
                  currency={currency}
                />
              </div>
            </>
          ) : (
            <p className="booking-summary__hint">{t(locale, "quoteHint")}</p>
          )}
          <p className="booking-receipt__meta">
            {hasDates
              ? `${t(locale, "staySummaryDates")}: ${formatStayDate(fields.arrival, locale)} – ${formatStayDate(fields.departure, locale)}. `
              : null}
            {fields.guestName.trim()
              ? `${fields.guestName.trim()}. `
              : null}
            {selectedRoom.name} · {selectedRoom.sleeps} ·{" "}
            {getRoomAvailabilityLabel(
              getRoomAvailableCount(selectedRoom, availabilityByRoomId),
            )}
            .
            {showPromoPricing
              ? ` Promotional pricing applies to ${displayQuote.promoNights} of ${nights} night${nights === 1 ? "" : "s"}.`
              : hasDates
                ? ""
                : ` Standard rate is ${formatMoney(selectedRoom.rate, currency)}/night.`}
          </p>
        </div>
        </fieldset>

        {bookableRooms.length === 0 ? (
          <p className="form-message form-message--error" role="alert">
            {t(locale, "allRoomsFull")}
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

        {isCancelingPayment ? (
          <p className="booking-summary__hint" aria-live="polite">
            {t(locale, "startingCheckout")}
          </p>
        ) : null}
      </form>

      {paymentStep ? (
        <BookingPaymentElement
          bankTransfer={bankTransfer}
          bookingId={paymentStep.bookingId}
          cardTotalDue={paymentStep.cardTotalDue}
          clientSecret={paymentStep.clientSecret}
          conversationToken={paymentStep.conversationToken}
          currency={currency}
          locale={locale}
          onCancel={handleCancelPayment}
          publishableKey={stripePublishableKey}
          returnUrl={paymentReturnUrl}
          stayTotal={paymentStep.stayTotal ?? deposit}
        />
      ) : null}
      </div>
    </section>
  );
}
