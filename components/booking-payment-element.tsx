"use client";

import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type StripeElementsOptions } from "@stripe/stripe-js";
import { useMemo, useState } from "react";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { t, type Locale } from "@/lib/i18n";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripePromise(publishableKey: string) {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

function PaymentForm({
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    <form className="booking-payment" onSubmit={handleSubmit}>
      <div className="booking-payment__element">
        <PaymentElement
          id="booking-payment-element"
          options={{
            layout: "tabs",
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

export function BookingPaymentElement({
  bookingId,
  clientSecret,
  currency,
  deposit,
  locale,
  onCancel,
  publishableKey,
  returnUrl,
}: {
  bookingId: string;
  clientSecret: string;
  currency: PropertyCurrency;
  deposit: number;
  locale: Locale;
  onCancel: () => void;
  publishableKey: string;
  returnUrl: string;
}) {
  const stripe = useMemo(() => getStripePromise(publishableKey), [publishableKey]);

  const options = useMemo<StripeElementsOptions>(
    () => ({
      clientSecret,
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
        rules: {
          ".Input": {
            border: "1px solid oklch(88% 0.012 12)",
            boxShadow: "none",
          },
          ".Input:focus": {
            border: "1px solid oklch(48% 0.18 12)",
            boxShadow: "0 0 0 3px oklch(96.5% 0.025 12)",
          },
          ".Tab": {
            border: "1px solid oklch(88% 0.012 12)",
          },
          ".Tab--selected": {
            border: "1px solid oklch(48% 0.18 12 / 0.35)",
            backgroundColor: "oklch(96.5% 0.025 12)",
          },
        },
      },
    }),
    [clientSecret],
  );

  return (
    <div className="booking-payment-shell">
      <p className="booking-payment-shell__title">{t(locale, "paymentDetails")}</p>
      <p className="booking-payment-shell__secure">{t(locale, "stripeSecureCheckout")}</p>
      <Elements options={options} stripe={stripe}>
        <PaymentForm
          bookingId={bookingId}
          currency={currency}
          deposit={deposit}
          locale={locale}
          onCancel={onCancel}
          returnUrl={returnUrl}
        />
      </Elements>
    </div>
  );
}
