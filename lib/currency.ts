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

export function getStripeCurrencyCode(currency: PropertyCurrency) {
  return currency;
}
