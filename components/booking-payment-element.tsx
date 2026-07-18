"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { startCardPaymentForBooking } from "@/app/actions";
import { BookingBankTransferPanel } from "@/components/booking-bank-transfer-panel";
import {
  isBankTransferConfigured,
  type BankTransferDetails,
} from "@/lib/bank-transfer";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { t, type Locale } from "@/lib/i18n";
import { calculateStripeChargeAmount } from "@/lib/payment-pricing";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

type PayMethod = "bank" | "card";

function CardPaymentForm({
  bookingId,
  currency,
  locale,
  onCancel,
  returnUrl,
  stayTotal,
}: {
  bookingId: string;
  currency: PropertyCurrency;
  locale: Locale;
  onCancel: () => void;
  returnUrl: string;
  stayTotal: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const charge = calculateStripeChargeAmount(stayTotal);

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
      <div className="booking-payment__charge-lines">
        <div>
          <span>{t(locale, "estimatedTotal")}</span>
          <span>{formatMoney(charge.stayTotal, currency)}</span>
        </div>
        <div>
          <span>{t(locale, "bankChargeLabel")}</span>
          <span>{formatMoney(charge.surcharge, currency)}</span>
        </div>
        <div className="booking-payment__charge-total">
          <strong>{t(locale, "depositDue")}</strong>
          <strong>{formatMoney(charge.totalDue, currency)}</strong>
        </div>
      </div>

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
            : `${t(locale, "payDeposit")} (${formatMoney(charge.totalDue, currency)})`}
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

export function BookingPaymentElement({
  bankTransfer,
  bookingId,
  clientSecret,
  currency,
  locale,
  onCancel,
  publishableKey,
  returnUrl,
  stayTotal,
}: {
  bankTransfer: BankTransferDetails;
  bookingId: string;
  clientSecret: string | null;
  currency: PropertyCurrency;
  locale: Locale;
  onCancel: () => void;
  publishableKey: string | null;
  returnUrl: string;
  stayTotal: number;
}) {
  const bankAvailable = currency === "thb" && isBankTransferConfigured(bankTransfer);
  const [method, setMethod] = useState<PayMethod>(bankAvailable ? "bank" : "card");
  const [cardClientSecret, setCardClientSecret] = useState(clientSecret);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isStartingCard, setIsStartingCard] = useState(
    !bankAvailable && !clientSecret,
  );
  const stripe = useMemo(
    () => (publishableKey ? getStripePromise(publishableKey) : null),
    [publishableKey],
  );

  useEffect(() => {
    if (method !== "card" || cardClientSecret || cardError) {
      return;
    }

    let cancelled = false;

    void startCardPaymentForBooking(bookingId).then((result) => {
      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setCardError(result.message);
        setIsStartingCard(false);
        return;
      }

      setCardClientSecret(result.clientSecret);
      setIsStartingCard(false);
    });

    return () => {
      cancelled = true;
    };
  }, [bookingId, cardClientSecret, cardError, method]);

  const options = useMemo<StripeElementsOptions | null>(
    () =>
      cardClientSecret
        ? {
            clientSecret: cardClientSecret,
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
    [cardClientSecret],
  );

  return (
    <div className="booking-payment-shell">
      <p className="booking-payment-shell__title">{t(locale, "paymentDetails")}</p>

      {bankAvailable ? (
        <div
          aria-label={t(locale, "paymentMethodLabel")}
          className="booking-payment__method-toggle"
          role="group"
        >
          <button
            aria-pressed={method === "bank"}
            className={`booking-payment__method-btn${
              method === "bank" ? " booking-payment__method-btn--active" : ""
            }`}
            onClick={() => setMethod("bank")}
            type="button"
          >
            {t(locale, "payWithBankTransfer")}
          </button>
          <button
            aria-pressed={method === "card"}
            className={`booking-payment__method-btn${
              method === "card" ? " booking-payment__method-btn--active" : ""
            }`}
            onClick={() => {
              setCardError(null);
              setIsStartingCard(!cardClientSecret);
              setMethod("card");
            }}
            type="button"
          >
            {t(locale, "payWithCard")}
          </button>
        </div>
      ) : null}

      <p className="booking-payment-shell__secure">
        {method === "bank"
          ? t(locale, "bankTransferSecureBadge")
          : t(locale, "paymentSecureBadge")}
      </p>
      <p className="booking-payment-shell__trust">
        {method === "bank"
          ? t(locale, "bankTransferTrust")
          : t(locale, "stripeSecureCheckout")}
      </p>
      <p className="booking-payment-shell__legal">
        {t(locale, "paymentTrustPolicies")}{" "}
        <Link href="/privacy">{t(locale, "paymentPrivacyLink")}</Link>
        {" · "}
        <Link href="/terms">{t(locale, "paymentTermsLink")}</Link>
      </p>

      {method === "bank" && bankAvailable ? (
        <BookingBankTransferPanel
          bankTransfer={bankTransfer}
          bookingId={bookingId}
          currency={currency}
          locale={locale}
          onCancel={onCancel}
          onSwitchToCard={() => {
            setCardError(null);
            setIsStartingCard(!cardClientSecret);
            setMethod("card");
          }}
          stayTotal={stayTotal}
        />
      ) : cardError ? (
        <p className="form-message form-message--error" role="alert">
          {cardError}
        </p>
      ) : isStartingCard || !cardClientSecret ? (
        <p className="booking-summary__hint" aria-live="polite">
          {t(locale, "startingCheckout")}
        </p>
      ) : !publishableKey || !stripe || !options ? (
        <p className="form-message form-message--error" role="alert">
          {t(locale, "paymentsNotConfigured")}
        </p>
      ) : (
        <Elements key={`card-${cardClientSecret}`} options={options} stripe={stripe}>
          <CardPaymentForm
            bookingId={bookingId}
            currency={currency}
            locale={locale}
            onCancel={onCancel}
            returnUrl={returnUrl}
            stayTotal={stayTotal}
          />
        </Elements>
      )}
    </div>
  );
}
