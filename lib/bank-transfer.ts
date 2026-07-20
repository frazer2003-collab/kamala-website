import type { PropertyCurrency } from "@/lib/currency";

export type BankTransferDetails = {
  promptPayId: string | null;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
};

function isNonEmpty(value: string | null): boolean {
  return value !== null && value.trim().length > 0;
}

export function hasPromptPayId(details: BankTransferDetails): boolean {
  return isNonEmpty(details.promptPayId);
}

export function hasBankAccountDetails(details: BankTransferDetails): boolean {
  return (
    isNonEmpty(details.bankName) &&
    isNonEmpty(details.accountName) &&
    isNonEmpty(details.accountNumber)
  );
}

export function isBankTransferConfigured(details: BankTransferDetails): boolean {
  return hasPromptPayId(details) || hasBankAccountDetails(details);
}

export function isBankTransferAvailable(
  details: BankTransferDetails,
  currency: PropertyCurrency,
): boolean {
  return currency === "thb" && isBankTransferConfigured(details);
}
