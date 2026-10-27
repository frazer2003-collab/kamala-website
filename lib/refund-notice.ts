/**
 * Shared wording for refunds. Card timing follows Stripe (the bank posts it).
 * Bank timing is a domestic Thai transfer.
 */

export const CARD_REFUND_GUEST_TIMING =
  "It usually shows on the card in 5 to 10 business days. The bank decides the exact day.";

export const BANK_REFUND_GUEST_TIMING =
  "Once it is sent, it usually arrives the same day, or the next business day if it goes out after bank hours.";

export type CardRefundReason =
  | "cheaper-stay"
  | "declined"
  | "cancelled"
  | "top-up-voided";

export type BankRefundReason = "cheaper-stay" | "declined" | "cancelled";

export function staffCardRefundCopy(
  guestName: string,
  amountLabel: string,
  reason: CardRefundReason,
  failed = false,
  keptChargeLabel: string | null = null,
) {
  const whatHappened = {
    "cheaper-stay": `${guestName} changed to a cheaper stay.`,
    declined: `${guestName}'s request was declined and the booking is closed.`,
    cancelled: `${guestName}'s stay was cancelled and the booking is closed.`,
    "top-up-voided": `${guestName} paid extra by card to change their stay, but those nights were no longer free, so the stay was not moved.`,
  }[reason];

  if (failed) {
    return {
      subject: `Card refund failed: ${guestName}`,
      intro: `${whatHappened} The automatic refund of ${amountLabel} did not go through.`,
      next: keptChargeLabel
        ? `Refund ${amountLabel} in Stripe and leave the ${keptChargeLabel} bank charge, then tell the guest. ${CARD_REFUND_GUEST_TIMING}`
        : `Refund ${amountLabel} in Stripe, then tell the guest. ${CARD_REFUND_GUEST_TIMING}`,
    };
  }

  const chargeNote = keptChargeLabel
    ? ` The ${keptChargeLabel} bank charge stays with the guesthouse.`
    : "";

  return {
    subject: `Card refund started: ${guestName}`,
    intro: `${whatHappened} Stripe is refunding ${amountLabel} to the card they paid with.${chargeNote} You do not send anything.`,
    next: CARD_REFUND_GUEST_TIMING,
  };
}

export function staffBankRefundCopy(
  guestName: string,
  amountLabel: string,
  reason: BankRefundReason,
) {
  const whatHappened = {
    "cheaper-stay": `${guestName} changed to a cheaper stay.`,
    declined: `${guestName}'s request was declined and the booking is closed.`,
    cancelled: `${guestName}'s stay was cancelled and the booking is closed.`,
  }[reason];

  return {
    subject: `Refund to send: ${guestName}`,
    intro: `${whatHappened} Send ${amountLabel} from the guesthouse bank account.`,
    next:
      reason === "cheaper-stay"
        ? `Ask for their account in the conversation if you do not have it. ${BANK_REFUND_GUEST_TIMING} Open Requests and tap Mark refund sent after it is on its way.`
        : `Ask for their account in the conversation if you do not have it. ${BANK_REFUND_GUEST_TIMING} The request is already closed, so send it from the bank app and tell the guest once it is on its way.`,
  };
}

export function staffBankRefundPanel(amountLabel: string) {
  return `Send ${amountLabel} from the guesthouse bank account, then mark it sent. Ask for their account in the conversation if you do not have it. ${BANK_REFUND_GUEST_TIMING}`;
}

export function guestCardRefundSentence(
  amountLabel: string,
  keptChargeLabel: string | null = null,
) {
  const chargeNote = keptChargeLabel
    ? ` The ${keptChargeLabel} bank charge stays with us.`
    : "";
  return `We refund ${amountLabel} to your card.${chargeNote} ${CARD_REFUND_GUEST_TIMING}`;
}

export function guestBankRefundSentence(amountLabel: string) {
  return `We will refund ${amountLabel} by bank transfer. ${BANK_REFUND_GUEST_TIMING}`;
}

export function guestBankRefundSentMessage(amountLabel: string) {
  return `We have sent your refund of ${amountLabel} by bank transfer. ${BANK_REFUND_GUEST_TIMING}`;
}
