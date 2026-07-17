"use client";

import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  loadStripe,
  type StripeCardElementOptions,
  type StripeElementsOptions,
} from "@stripe/stripe-js";
import { useEffect, useMemo, useState } from "react";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { t, type Locale } from "@/lib/i18n";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

type PayMethod = "promptpay" | "card";

const cardElementOptions: StripeCardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      color: "oklch(23% 0.028 12)",
      fontFamily:
        '"Plus Jakarta Sans", "Aptos", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
      fontSize: "16px",
      "::placeholder": {
        color: "oklch(55% 0.02 12)",
      },
    },
    invalid: {
      color: "oklch(50% 0.17 12)",
    },
  },
};

function CardPaymentForm({
  bookingId,
  clientSecret,
  currency,
  deposit,
  guestEmail,
  locale,
  onCancel,
  returnUrl,
}: {
  bookingId: string;
  clientSecret: string;
  currency: PropertyCurrency;
  deposit: number;
  guestEmail: string;
  locale: Locale;
  onCancel: () => void;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) {
      return;
    }

    const card = elements.getElement(CardElement);
    if (!card) {
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    const email = guestEmail.trim();
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card,
        billing_details: email ? { email } : undefined,
      },
      return_url: returnUrl,
    });

    if (error) {
      setErrorMessage(error.message ?? t(locale, "paymentFailed"));
      setIsPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      window.location.assign(returnUrl);
      return;
    }

    setIsPaying(false);
  }

  return (
    <div className="booking-payment">
      <div className="booking-payment__element booking-payment__element--card">
        <label className="booking-payment__card-label" htmlFor="booking-card-element">
          {t(locale, "payWithCard")}
        </label>
        <div className="booking-payment__card-field" id="booking-card-element">
          <CardElement
            options={cardElementOptions}
            onChange={(event) => {
              setCardComplete(event.complete);
              setErrorMessage(event.error?.message ?? null);
            }}
          />
        </div>
      </div>

      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="booking-payment__actions">
        <button
          className="button button--primary"
          disabled={!stripe || !elements || !cardComplete || isPaying}
          onClick={() => void handlePay()}
          type="button"
        >
          {isPaying
            ? t(locale, "processingPayment")
            : `${t(locale, "payDeposit")} (${formatMoney(deposit, currency)})`}
        </button>
        <button
          className="button button--secondary"
          disabled={isPaying}
          onClick={onCancel}
          type="button"
        >
          {t(locale, "editBookingDetails")}
        </button>
      </div>

      <input name="booking-id" type="hidden" value={bookingId} />
    </div>
  );
}

function PromptPayQrPanel({
  clientSecret,
  currency,
  deposit,
  guestEmail,
  locale,
  onCancel,
  onSwitchToCard,
  publishableKey,
  returnUrl,
}: {
  clientSecret: string;
  currency: PropertyCurrency;
  deposit: number;
  guestEmail: string;
  locale: Locale;
  onCancel: () => void;
  onSwitchToCard: () => void;
  publishableKey: string;
  returnUrl: string;
}) {
  const stripe = useMemo(() => getStripePromise(publishableKey), [publishableKey]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!qrUrl || !stripe) {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(() => {
      void (async () => {
        const stripeJs = await stripe;
        if (!stripeJs || cancelled) {
          return;
        }

        const { paymentIntent } = await stripeJs.retrievePaymentIntent(clientSecret);
        if (!paymentIntent || cancelled) {
          return;
        }

        if (paymentIntent.status === "succeeded") {
          window.clearInterval(interval);
          window.location.assign(returnUrl);
          return;
        }

        if (
          paymentIntent.status === "canceled" ||
          paymentIntent.status === "requires_payment_method"
        ) {
          window.clearInterval(interval);
          setErrorMessage(t(locale, "paymentFailed"));
          setQrUrl(null);
          setStatusLabel(null);
        }
      })();
    }, 2500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [clientSecret, locale, qrUrl, returnUrl, stripe]);

  async function handleShowQr() {
    setIsStarting(true);
    setErrorMessage(null);
    setStatusLabel(null);

    const stripeJs = await stripe;
    if (!stripeJs) {
      setErrorMessage(t(locale, "paymentFailed"));
      setIsStarting(false);
      return;
    }

    const email = guestEmail.trim();
    if (!email) {
      setErrorMessage(t(locale, "paymentFailed"));
      setIsStarting(false);
      return;
    }

    // handleActions: false keeps the QR on this page instead of Stripe's
    // hosted / email voucher flow.
    const { error, paymentIntent } = await stripeJs.confirmPromptPayPayment(
      clientSecret,
      {
        payment_method: {
          billing_details: {
            email,
          },
        },
      },
      {
        handleActions: false,
      },
    );

    if (error) {
      setErrorMessage(error.message ?? t(locale, "paymentFailed"));
      setIsStarting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      window.location.assign(returnUrl);
      return;
    }

    const nextAction = paymentIntent?.next_action as
      | {
          type?: string;
          promptpay_display_qr_code?: {
            image_url_png?: string | null;
            image_url_svg?: string | null;
          };
        }
      | null
      | undefined;
    const qr = nextAction?.promptpay_display_qr_code;

    if (qr?.image_url_png || qr?.image_url_svg) {
      setQrUrl(qr.image_url_png ?? qr.image_url_svg ?? null);
      setStatusLabel(t(locale, "promptPayWaiting"));
      setIsStarting(false);
      return;
    }

    setErrorMessage(t(locale, "paymentFailed"));
    setIsStarting(false);
  }

  return (
    <div className="booking-payment booking-payment--promptpay">
      {!qrUrl ? (
        <>
          <p className="booking-payment__promptpay-intro">{t(locale, "promptPayIntro")}</p>
          <div className="booking-payment__actions">
            <button
              className="button button--primary"
              disabled={isStarting}
              onClick={() => void handleShowQr()}
              type="button"
            >
              {isStarting
                ? t(locale, "processingPayment")
                : `${t(locale, "showPromptPayQr")} (${formatMoney(deposit, currency)})`}
            </button>
            <button
              className="button button--secondary"
              disabled={isStarting}
              onClick={onSwitchToCard}
              type="button"
            >
              {t(locale, "payWithCardInstead")}
            </button>
            <button
              className="button button--quiet"
              disabled={isStarting}
              onClick={onCancel}
              type="button"
            >
              {t(locale, "editBookingDetails")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="booking-payment__qr">
            <img
              alt={t(locale, "promptPayQrAlt")}
              className="booking-payment__qr-image"
              height={280}
              src={qrUrl}
              width={280}
            />
            <p className="booking-payment__qr-amount">
              {formatMoney(deposit, currency)}
            </p>
            <p className="booking-payment__qr-hint" role="status">
              {statusLabel}
            </p>
          </div>
          <div className="booking-payment__actions">
            <button
              className="button button--secondary"
              onClick={onSwitchToCard}
              type="button"
            >
              {t(locale, "payWithCardInstead")}
            </button>
            <button className="button button--quiet" onClick={onCancel} type="button">
              {t(locale, "editBookingDetails")}
            </button>
          </div>
        </>
      )}

      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

export function BookingPaymentElement({
  bookingId,
  clientSecret,
  currency,
  deposit,
  guestEmail,
  locale,
  onCancel,
  publishableKey,
  returnUrl,
}: {
  bookingId: string;
  clientSecret: string;
  currency: PropertyCurrency;
  deposit: number;
  guestEmail: string;
  locale: Locale;
  onCancel: () => void;
  publishableKey: string;
  returnUrl: string;
}) {
  const supportsPromptPay = currency === "thb";
  const [method, setMethod] = useState<PayMethod>(
    supportsPromptPay ? "promptpay" : "card",
  );
  const stripe = useMemo(() => getStripePromise(publishableKey), [publishableKey]);

  // Card path uses CardElement (card-only). Do not pass clientSecret here —
  // Payment Element would otherwise list every method on the PaymentIntent
  // (including PromptPay), duplicating our top toggle.
  const options = useMemo<StripeElementsOptions>(
    () => ({
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "oklch(48% 0.18 12)",
          colorBackground: "oklch(100% 0 0)",
          colorText: "oklch(23% 0.028 12)",
          colorDanger: "oklch(50% 0.17 12)",
          fontFamily:
            '"Plus Jakarta Sans", "Aptos", "Segoe UI", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          borderRadius: "0.75rem",
          spacingUnit: "4px",
        },
      },
    }),
    [],
  );

  return (
    <div className="booking-payment-shell">
      <p className="booking-payment-shell__title">{t(locale, "paymentDetails")}</p>
      <p className="booking-payment-shell__secure">{t(locale, "stripeSecureCheckout")}</p>

      {supportsPromptPay ? (
        <div
          aria-label={t(locale, "paymentDetails")}
          className="booking-payment__method-toggle"
          role="group"
        >
          <button
            aria-pressed={method === "promptpay"}
            className={`booking-payment__method-btn${
              method === "promptpay" ? " booking-payment__method-btn--active" : ""
            }`}
            onClick={() => setMethod("promptpay")}
            type="button"
          >
            {t(locale, "payWithPromptPay")}
          </button>
          <button
            aria-pressed={method === "card"}
            className={`booking-payment__method-btn${
              method === "card" ? " booking-payment__method-btn--active" : ""
            }`}
            onClick={() => setMethod("card")}
            type="button"
          >
            {t(locale, "payWithCard")}
          </button>
        </div>
      ) : null}

      {method === "promptpay" && supportsPromptPay ? (
        <PromptPayQrPanel
          clientSecret={clientSecret}
          currency={currency}
          deposit={deposit}
          guestEmail={guestEmail}
          locale={locale}
          onCancel={onCancel}
          onSwitchToCard={() => setMethod("card")}
          publishableKey={publishableKey}
          returnUrl={returnUrl}
        />
      ) : (
        <Elements options={options} stripe={stripe}>
          <CardPaymentForm
            bookingId={bookingId}
            clientSecret={clientSecret}
            currency={currency}
            deposit={deposit}
            guestEmail={guestEmail}
            locale={locale}
            onCancel={onCancel}
            returnUrl={returnUrl}
          />
        </Elements>
      )}
    </div>
  );
}
