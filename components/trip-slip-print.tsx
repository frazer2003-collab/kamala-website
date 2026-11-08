"use client";

export function TripSlipPrint() {
  return (
    <button
      className="button button--primary"
      onClick={() => window.print()}
      type="button"
    >
      Print / Save PDF
    </button>
  );
}
