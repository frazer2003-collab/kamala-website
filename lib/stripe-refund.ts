/** True when Stripe says this charge has nothing left to refund. */
export function isStripeChargeAlreadyRefunded(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as {
    code?: unknown;
    message?: unknown;
    raw?: { code?: unknown; message?: unknown };
  };
  const code = String(record.code ?? record.raw?.code ?? "");
  const message = String(record.message ?? record.raw?.message ?? "");

  return (
    code === "charge_already_refunded" || /already been refunded/i.test(message)
  );
}
