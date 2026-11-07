export type Satang = number;

function assertIntegerSatang(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("Satang must be a safe integer.");
  }
}

export function bahtToSatang(baht: number): Satang {
  if (!Number.isFinite(baht)) {
    throw new RangeError("Baht must be finite.");
  }

  const satang = Math.round(baht * 100);
  assertIntegerSatang(satang);
  return satang;
}

export function satangToBaht(satang: Satang): number {
  assertIntegerSatang(satang);
  return satang / 100;
}

export function parseBahtToSatang(raw: string): Satang | null {
  const match = raw.trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return null;
  }

  const whole = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const satang = whole * 100 + Number(fraction);
  return Number.isSafeInteger(satang) ? satang : null;
}

export function formatSatang(
  satang: Satang,
  locale = "en-US",
): string {
  assertIntegerSatang(satang);
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(satang / 100);
  return `฿${amount}`;
}
