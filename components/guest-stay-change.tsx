"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useId, useMemo, useState } from "react";
import {
  finishGuestCardStayChange,
  quoteGuestStayChange,
  submitGuestStayChange,
  type GuestStayChangeQuote,
} from "@/app/booking/change/actions";
import type { BankTransferDetails } from "@/lib/bank-transfer";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { buildPromptPayPayload } from "@/lib/promptpay";

const GuestStayCalendar = dynamic(
  () =>
    import("@/components/guest-stay-calendar").then(
      (module) => module.GuestStayCalendar,
    ),
  { ssr: false },
);

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

type CurrentStay = {
  roomId: string;
  roomName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  paidAmount: number | null;
};

type RoomChoice = { id: string; name: string; sleeps: string };

type Phase =
  | { step: "choose" }
  | { step: "card"; clientSecret: string; totalDue: number }
  | { step: "done"; kind: "applied" | "bank-pending"; showStay: boolean }
  | { step: "finishing" };

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
}

function formatRange(arrival: string, departure: string) {
  const short = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
  return `${short.format(new Date(`${arrival}T00:00:00`))} – ${short.format(new Date(`${departure}T00:00:00`))}`;
}

function nightsLabel(count: number) {
  return `${count} night${count === 1 ? "" : "s"}`;
}

function countNights(arrival: string, departure: string) {
  const ms =
    new Date(`${departure}T00:00:00`).getTime() -
    new Date(`${arrival}T00:00:00`).getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

const stripeAppearance: StripeElementsOptions["appearance"] = {
  theme: "stripe",
  variables: {
    colorPrimary: "#7a2430",
    colorBackground: "#ffffff",
    colorText: "#24191b",
    colorDanger: "#9b2c2c",
    fontFamily:
      '"Plus Jakarta Sans", "Aptos", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    borderRadius: "0.75rem",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #e2d7d9", boxShadow: "none" },
    ".Input:focus": {
      border: "1px solid #7a2430",
      boxShadow: "0 0 0 3px rgba(122, 36, 48, 0.12)",
    },
  },
};

function CardTopUpForm({
  totalDue,
  currency,
  returnUrl,
  onPaid,
  onBack,
}: {
  totalDue: number;
  currency: PropertyCurrency;
  returnUrl: string;
  onPaid: (paymentIntentId: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }
    setIsPaying(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: "if_required",
    });

    if (result.error) {
      setError(result.error.message || "The payment didn’t go through. Please try again.");
      setIsPaying(false);
      return;
    }
    onPaid(result.paymentIntent.id);
  }

  return (
    <form className="stay-change__card" onSubmit={handlePay}>
      <PaymentElement
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
          wallets: { applePay: "never", googlePay: "never" },
        }}
      />
      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="stay-change__actions">
        <button
          className="button button--primary"
          disabled={!stripe || !elements || isPaying}
          type="submit"
        >
          {isPaying ? "Paying…" : `Pay ${formatMoney(totalDue, currency)}`}
        </button>
        <button
          className="button button--quiet"
          disabled={isPaying}
          onClick={onBack}
          type="button"
        >
          Back
        </button>
      </div>
    </form>
  );
}

function TransferQr({
  amount,
  bankTransfer,
  currency,
}: {
  amount: number;
  bankTransfer: BankTransferDetails;
  currency: PropertyCurrency;
}) {
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!bankTransfer.promptPayId) {
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(buildPromptPayPayload(bankTransfer.promptPayId, amount), {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
    })
      .then((url) => {
        if (!cancelled) {
          setQr(url);
        }
      })
      .catch(() => null);
    return () => {
      cancelled = true;
    };
  }, [amount, bankTransfer.promptPayId]);

  return (
    <div className="stay-change__transfer">
      {bankTransfer.promptPayId ? (
        qr ? (
          <Image
            alt={`PromptPay QR code for ${formatMoney(amount, currency)}`}
            className="stay-change__qr"
            height={280}
            src={qr}
            unoptimized
            width={280}
          />
        ) : (
          <div aria-hidden="true" className="stay-change__qr stay-change__qr--loading" />
        )
      ) : null}
      {bankTransfer.accountNumber ? (
        <p className="stay-change__account">
          {bankTransfer.bankName} · {bankTransfer.accountName} ·{" "}
          <span className="stay-change__account-number">{bankTransfer.accountNumber}</span>
        </p>
      ) : null}
    </div>
  );
}

export function GuestStayChange({
  bankTransfer,
  chatPath,
  currency,
  current,
  guestName,
  publishableKey,
  returnedPaymentIntent,
  rooms,
  todayIso,
  token,
}: {
  bankTransfer: BankTransferDetails | null;
  chatPath: string;
  currency: PropertyCurrency;
  current: CurrentStay;
  guestName: string;
  publishableKey: string | null;
  returnedPaymentIntent: string | null;
  rooms: RoomChoice[];
  todayIso: string;
  token: string;
}) {
  const formId = useId();
  const [roomId, setRoomId] = useState(current.roomId);
  const [arrival, setArrival] = useState(current.arrivalDate);
  const [departure, setDeparture] = useState(current.departureDate);
  const [calendarFocus, setCalendarFocus] = useState<"arrival" | "departure" | null>(null);
  const [quoted, setQuoted] = useState<{
    key: string;
    quote: GuestStayChangeQuote;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(
    returnedPaymentIntent ? { step: "finishing" } : { step: "choose" },
  );
  const unchanged =
    roomId === current.roomId &&
    arrival === current.arrivalDate &&
    departure === current.departureDate;
  const selectionKey = `${roomId}|${arrival}|${departure}`;
  const quote = !unchanged && quoted?.key === selectionKey ? quoted.quote : null;
  const isQuoting = !unchanged && !quote;
  const shouldQuote = !unchanged && phase.step === "choose" && !calendarFocus;
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedRoomName = selectedRoom?.name ?? current.roomName;
  const availabilityUrl = `/api/guest/change-availability?token=${encodeURIComponent(token)}&room=${encodeURIComponent(roomId)}`;
  const stripe = useMemo(
    () => (publishableKey ? getStripePromise(publishableKey) : null),
    [publishableKey],
  );

  useEffect(() => {
    if (!returnedPaymentIntent) {
      return;
    }
    void finishGuestCardStayChange(token, returnedPaymentIntent).then((result) => {
      window.history.replaceState(null, "", `/booking/change?token=${encodeURIComponent(token)}`);
      if (result.ok) {
        setPhase({ step: "done", kind: "applied", showStay: false });
      } else {
        setSubmitError(result.message);
        setPhase({ step: "choose" });
      }
    });
  }, [returnedPaymentIntent, token]);

  useEffect(() => {
    if (!shouldQuote) {
      return;
    }

    let cancelled = false;
    const key = `${roomId}|${arrival}|${departure}`;
    const timer = window.setTimeout(() => {
      void quoteGuestStayChange(token, {
        roomId,
        arrivalDate: arrival,
        departureDate: departure,
      })
        .catch(
          (): GuestStayChangeQuote => ({
            ok: false,
            message: "We couldn’t check those dates. Please try again.",
          }),
        )
        .then((result) => {
          if (!cancelled) {
            setQuoted({ key, quote: result });
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [arrival, departure, roomId, shouldQuote, token]);

  async function handleSubmit() {
    if (!quote?.ok || isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await submitGuestStayChange(
        token,
        { roomId, arrivalDate: arrival, departureDate: departure },
        quote.newTotal,
      );
      if (!result.ok) {
        setSubmitError(result.message);
        const fresh = await quoteGuestStayChange(token, {
          roomId,
          arrivalDate: arrival,
          departureDate: departure,
        });
        setQuoted({ key: selectionKey, quote: fresh });
      } else if (result.result === "card") {
        setPhase({ step: "card", clientSecret: result.clientSecret, totalDue: result.totalDue });
      } else {
        setPhase({ step: "done", kind: result.result, showStay: true });
      }
    } catch {
      setSubmitError("Something went wrong. Your stay is unchanged — please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCardPaid(paymentIntentId: string) {
    setPhase({ step: "finishing" });
    const result = await finishGuestCardStayChange(token, paymentIntentId);
    if (result.ok) {
      setPhase({ step: "done", kind: "applied", showStay: true });
    } else {
      setSubmitError(result.message);
      setPhase({ step: "choose" });
    }
  }

  if (phase.step === "finishing") {
    return (
      <div className="stay-change__panel" aria-live="polite">
        <h1>Updating your stay…</h1>
        <p className="stay-change__now">Confirming your payment. This takes a few seconds.</p>
      </div>
    );
  }

  if (phase.step === "done") {
    const newStay = `${selectedRoomName} · ${formatRange(arrival, departure)} · ${nightsLabel(countNights(arrival, departure))}`;
    return (
      <div className="stay-change__panel stay-change__panel--done" aria-live="polite">
        {phase.kind === "applied" ? (
          <>
            <h1>Your stay is updated.</h1>
            {phase.showStay ? <p className="stay-change__now">{newStay}</p> : null}
            <p>We’ve let the guesthouse know. See you soon, {guestName}.</p>
          </>
        ) : (
          <>
            <h1>Thanks — we’re checking your transfer.</h1>
            <p className="stay-change__now">{newStay}</p>
            <p>Your stay moves to these dates once we see the payment. We’ll email you.</p>
          </>
        )}
        <Link className="button button--secondary" href={chatPath}>
          Message us
        </Link>
      </div>
    );
  }

  if (phase.step === "card") {
    return (
      <div className="stay-change__panel">
        <h1>Pay the difference</h1>
        <p className="stay-change__now">
          {selectedRoomName} · {formatRange(arrival, departure)}
        </p>
        {stripe ? (
          <Elements
            options={{ clientSecret: phase.clientSecret, appearance: stripeAppearance }}
            stripe={stripe}
          >
            <CardTopUpForm
              currency={currency}
              onBack={() => setPhase({ step: "choose" })}
              onPaid={(id) => void handleCardPaid(id)}
              returnUrl={`${window.location.origin}/booking/change?token=${encodeURIComponent(token)}`}
              totalDue={phase.totalDue}
            />
          </Elements>
        ) : (
          <p className="form-message form-message--error" role="alert">
            Card payments aren’t available right now. Message us to change your stay.
          </p>
        )}
      </div>
    );
  }

  const roomLegendId = `${formId}-room`;
  const datesLegendId = `${formId}-dates`;
  const bankUnavailable = quote?.ok && quote.kind === "pay-bank" && !bankTransfer;

  return (
    <div className="stay-change__panel">
      <header className="stay-change__intro">
        <h1>Change your stay</h1>
        <p className="stay-change__now">
          Now: {current.roomName} · {formatRange(current.arrivalDate, current.departureDate)} ·{" "}
          {nightsLabel(current.nights)}
          {current.paidAmount ? ` · ${formatMoney(current.paidAmount, currency)} paid` : ""}
        </p>
      </header>

      <fieldset aria-labelledby={roomLegendId} className="stay-change__step">
        <h2 className="stay-change__step-title" id={roomLegendId}>
          1. Pick a room
        </h2>
        <div className="stay-change__rooms">
          {rooms.map((room) => (
            <label
              className={`stay-change__room${room.id === roomId ? " stay-change__room--selected" : ""}`}
              key={room.id}
            >
              <input
                checked={room.id === roomId}
                name="room"
                onChange={() => {
                  setRoomId(room.id);
                  setSubmitError(null);
                }}
                type="radio"
                value={room.id}
              />
              <span className="stay-change__room-name">{room.name}</span>
              <span className="stay-change__room-meta">
                {room.id === current.roomId ? "Your room now" : room.sleeps}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset aria-labelledby={datesLegendId} className="stay-change__step">
        <h2 className="stay-change__step-title" id={datesLegendId}>
          2. Pick your dates
        </h2>
        <p className="stay-change__hint">Grey dates are taken for this room.</p>
        <div className="stay-change__dates">
          <button
            aria-haspopup="dialog"
            className="stay-change__date"
            id={`${formId}-arrival`}
            onClick={() => setCalendarFocus("arrival")}
            type="button"
          >
            <span className="stay-change__date-label">Check in</span>
            <span className="stay-change__date-value">{formatDay(arrival)}</span>
          </button>
          <button
            aria-haspopup="dialog"
            className="stay-change__date"
            id={`${formId}-departure`}
            onClick={() => setCalendarFocus("departure")}
            type="button"
          >
            <span className="stay-change__date-label">Check out</span>
            <span className="stay-change__date-value">{formatDay(departure)}</span>
          </button>
        </div>
      </fieldset>

      <div aria-live="polite" className="stay-change__result">
        {unchanged ? (
          <p className="stay-change__hint">Pick a new room or new dates to see the price.</p>
        ) : isQuoting || !quote ? (
          <p className="stay-change__hint">Checking {selectedRoomName}…</p>
        ) : !quote.ok ? (
          <p className="stay-change__problem">{quote.message}</p>
        ) : (
          <div className="stay-change__offer">
            <p className="stay-change__new">
              New: {selectedRoomName} · {formatRange(arrival, departure)} ·{" "}
              {nightsLabel(quote.nights)}
            </p>
            {bankUnavailable ? (
              <p className="stay-change__problem">
                This change costs more and needs a bank transfer. Message us and we’ll arrange it.
              </p>
            ) : (
              <>
                <p className="stay-change__money">{quote.sentence}</p>
                {quote.kind === "pay-bank" && bankTransfer && quote.transferAmount ? (
                  <TransferQr
                    amount={quote.transferAmount}
                    bankTransfer={bankTransfer}
                    currency={currency}
                  />
                ) : null}
                {submitError ? (
                  <p className="form-message form-message--error" role="alert">
                    {submitError}
                  </p>
                ) : null}
                <button
                  className="button button--primary stay-change__submit"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  {isSubmitting ? "One moment…" : quote.action}
                </button>
              </>
            )}
          </div>
        )}
        {submitError && (unchanged || !quote?.ok) ? (
          <p className="form-message form-message--error" role="alert">
            {submitError}
          </p>
        ) : null}
      </div>

      <p className="stay-change__help">
        Need something else? <Link href={chatPath}>Message us</Link>.
      </p>

      {calendarFocus ? (
        <GuestStayCalendar
          arrival={arrival}
          availabilityUrl={availabilityUrl}
          blockFullRanges
          departure={departure}
          focus={calendarFocus}
          fullHint={`Grey dates are taken for ${selectedRoomName}.`}
          key={availabilityUrl}
          onChange={({ arrival: nextArrival, departure: nextDeparture }) => {
            setArrival(nextArrival);
            setDeparture(nextDeparture);
            setSubmitError(null);
          }}
          onClose={() => {
            const focusId =
              calendarFocus === "departure" ? `${formId}-departure` : `${formId}-arrival`;
            setCalendarFocus(null);
            queueMicrotask(() => document.getElementById(focusId)?.focus());
          }}
          todayIso={todayIso}
        />
      ) : null}
    </div>
  );
}
