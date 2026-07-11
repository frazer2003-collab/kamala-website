export type PropertyCurrency = "thb" | "usd";

export function formatMoney(
  amount: number,
  currency: PropertyCurrency,
  locale = "en-US",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Amount with currency code after the number, e.g. "2,100 THB". */
export function formatMoneySuffix(
  amount: number,
  currency: PropertyCurrency = "thb",
  locale = "en-US",
) {
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} ${currency.toUpperCase()}`;
}

/** Compact amount for tight UI cells, e.g. "1.1k THB". */
export function formatMoneyCompactSuffix(
  amount: number,
  currency: PropertyCurrency = "thb",
) {
  const code = currency.toUpperCase();

  if (amount >= 1000) {
    const thousands = amount / 1000;
    const compact =
      thousands % 1 === 0 ? `${thousands}k` : `${thousands.toFixed(1).replace(/\.0$/, "")}k`;
    return `${compact} ${code}`;
  }

  return formatMoneySuffix(amount, currency);
}

export function getStripeCurrencyCode(currency: PropertyCurrency) {
  return currency;
}
