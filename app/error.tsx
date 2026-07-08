"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="site-shell error-state">
      <section className="booking-panel" role="alert">
        <div>
          <p className="section-note">Something needs attention</p>
          <h1>We could not load the booking page.</h1>
          <p>
            Try again in a moment. If this keeps happening, call the guesthouse
            and staff can check availability for you.
          </p>
        </div>
        <button className="button button--primary" type="button" onClick={reset}>
          Try loading again
        </button>
      </section>
    </main>
  );
}
