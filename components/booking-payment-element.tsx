"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { setPendingBookingPaymentMethods } from "@/app/actions";
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

function CardPaymentForm({
  bookingId,
  currency,
  deposit,
  locale,
  onCancel,
  returnUrl,
}: {
  bookingId: string;
  currency: PropertyCurrency;
  deposit: number;
  locale: Locale;
  onCancel: () => void;
  returnUrl: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  async function handlePay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!stripe || !elements) {
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    });

    if (error) {
      setErrorMessage(error.message ?? t(locale, "paymentFailed"));
      setIsPaying(false);
    }
  }

  return (
    <form className="booking-payment" onSubmit={handlePay}>
      <div className="booking-payment__element">
        <PaymentElement
          id="booking-payment-element"
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            wallets: {
              applePay: "never",
              googlePay: "never",
            },
          }}
        />
      </div>

      {errorMessage ? (
        <p className="form-message form-message--error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="booking-payment__actions">
        <button
          className="button button--primary"
          disabled={!stripe || !elements || isPaying}
          type="submit"
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
    </form>
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
  clientSecret: string | null;
  currency: PropertyCurrency;
  deposit: number;
  guestEmail: string;
  locale: Locale;
  onCancel: () => void;
  publishableKey: string | null;
  returnUrl: string;
}) {
  const supportsPromptPay = false;
  const [method, setMethod] = useState<PayMethod>(
    supportsPromptPay ? "promptpay" : "card",
  );
  const [methodsReady, setMethodsReady] = useState(!supportsPromptPay);
  const [methodError, setMethodError] = useState<string | null>(null);
  const [isUpdatingMethods, startUpdatingMethods] = useTransition();
  const stripe = useMemo(
    () => (publishableKey ? getStripePromise(publishableKey) : null),
    [publishableKey],
  );

  useEffect(() => {
    if (!supportsPromptPay) {
      setMethodsReady(true);
      return;
    }

    let cancelled = false;
    setMethodsReady(false);
    setMethodError(null);

    startUpdatingMethods(() => {
      void setPendingBookingPaymentMethods(bookingId).then((result) => {
        if (cancelled) {
          return;
        }

        if (!result.ok) {
          setMethodError(result.message);
          setMethodsReady(false);
          return;
        }

        setMethodsReady(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [bookingId, method, supportsPromptPay]);

  const options = useMemo<StripeElementsOptions | null>(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
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
                ".Input": {
                  border: "1px solid #e2d7d9",
                  boxShadow: "none",
                },
                ".Input:focus": {
                  border: "1px solid #7a2430",
                  boxShadow: "0 0 0 3px rgba(122, 36, 48, 0.12)",
                },
                ".Tab": {
                  border: "1px solid #e2d7d9",
                },
                ".Tab--selected": {
                  border: "1px solid rgba(122, 36, 48, 0.35)",
                  backgroundColor: "#faf5f6",
                },
              },
            },
          }
        : null,
    [clientSecret],
  );

  return (
    <div className="booking-payment-shell">
      <p className="booking-payment-shell__title">{t(locale, "paymentDetails")}</p>
      <p className="booking-payment-shell__secure">{t(locale, "paymentSecureBadge")}</p>
      <p className="booking-payment-shell__trust">{t(locale, "stripeSecureCheckout")}</p>
      <p className="booking-payment-shell__legal">
        {t(locale, "paymentTrustPolicies")}{" "}
        <Link href="/privacy">{t(locale, "paymentPrivacyLink")}</Link>
        {" · "}
        <Link href="/terms">{t(locale, "paymentTermsLink")}</Link>
      </p>

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
            disabled={isUpdatingMethods}
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
            disabled={isUpdatingMethods}
            onClick={() => setMethod("card")}
            type="button"
          >
            {t(locale, "payWithCard")}
          </button>
        </div>
      ) : null}

      {methodError ? (
        <p className="form-message form-message--error" role="alert">
          {methodError}
        </p>
      ) : null}

      {!clientSecret ? null : !publishableKey || !stripe || !options ? (
        <p className="form-message form-message--error" role="alert">
          {t(locale, "paymentsNotConfigured")}
        </p>
      ) : !methodsReady || isUpdatingMethods ? (
        <p className="booking-summary__hint" aria-live="polite">
          {t(locale, "startingCheckout")}
        </p>
      ) : method === "promptpay" && supportsPromptPay ? (
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
        <Elements key={`card-${clientSecret}`} options={options} stripe={stripe}>
          <CardPaymentForm
            bookingId={bookingId}
            currency={currency}
            deposit={deposit}
            locale={locale}
            onCancel={onCancel}
            returnUrl={returnUrl}
          />
        </Elements>
      )}
    </div>
  );
}
