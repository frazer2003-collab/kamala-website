import { t, type Locale } from "@/lib/i18n";

type BookingProgressProps = {
  step: 1 | 2 | 3;
  locale: Locale;
};

const stepKeys = ["progressStay", "progressDetails", "progressPay"] as const;

export function BookingProgress({ step, locale }: BookingProgressProps) {
  return (
    <ol className="booking-progress" aria-label="Booking progress">
      {stepKeys.map((key, index) => {
        const stepNumber = (index + 1) as 1 | 2 | 3;
        const isComplete = step > stepNumber;
        const isCurrent = step === stepNumber;

        return (
          <li
            key={key}
            className={[
              "booking-progress__step",
              isComplete ? "booking-progress__step--complete" : "",
              isCurrent ? "booking-progress__step--current" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="booking-progress__marker" aria-hidden="true">
              {isComplete ? (
                <svg viewBox="0 0 12 12" width="12" height="12" fill="none">
                  <path
                    d="M2 6.2 4.8 9 10 3.2"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
              ) : (
                stepNumber
              )}
            </span>
            <span className="booking-progress__label">{t(locale, key)}</span>
          </li>
        );
      })}
    </ol>
  );
}
