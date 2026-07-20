import { t, type Locale } from "@/lib/i18n";

type BookingProgressProps = {
  step: 1 | 2 | 3;
  locale: Locale;
};

const stepKeys = ["progressStay", "progressDetails", "progressPay"] as const;

export function BookingProgress({ step, locale }: BookingProgressProps) {
  const currentLabel = t(locale, stepKeys[step - 1]);

  return (
    <p className="booking-progress booking-progress--quiet" aria-live="polite">
      <span className="booking-progress__current">
        {step} of 3 · {currentLabel}
      </span>
    </p>
  );
}
