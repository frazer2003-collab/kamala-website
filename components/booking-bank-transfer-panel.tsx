"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";
import { claimBankTransferPayment } from "@/app/actions";
import {
  hasBankAccountDetails,
  hasPromptPayId,
  type BankTransferDetails,
} from "@/lib/bank-transfer";
import { formatMoney, type PropertyCurrency } from "@/lib/currency";
import { t, type Locale } from "@/lib/i18n";
import { buildPromptPayPayload } from "@/lib/promptpay";

export function BookingBankTransferPanel({
  bankTransfer,
  bookingId,
  conversationToken,
  currency,
  locale,
  onCancel,
  onSwitchToCard,
  stayTotal,
}: {
  bankTransfer: BankTransferDetails;
  bookingId: string;
  conversationToken: string;
  currency: PropertyCurrency;
  locale: Locale;
  onCancel: () => void;
  onSwitchToCard: () => void;
  stayTotal: number;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const showPromptPay = hasPromptPayId(bankTransfer);
  const showBankAccount = hasBankAccountDetails(bankTransfer);

  useEffect(() => {
    if (!showPromptPay || !bankTransfer.promptPayId) {
      return;
    }

    const promptPayId = bankTransfer.promptPayId;
    let cancelled = false;

    void (async () => {
      try {
        const payload = buildPromptPayPayload(promptPayId, stayTotal);
        const dataUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
        });
        if (!cancelled) {
          setQrError(false);
          setQrDataUrl(dataUrl);
        }
      } catch {
        if (!cancelled) {
          setQrError(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bankTransfer.promptPayId, showPromptPay, stayTotal]);

  async function handleClaim() {
    setIsClaiming(true);
    setClaimError(null);

    try {
      const result = await claimBankTransferPayment(bookingId, conversationToken);
      if (!result.ok) {
        setClaimError(t(locale, result.errorCode));
        setIsClaiming(false);
        return;
      }

      const params = new URLSearchParams({
        booking: bookingId,
        lang: locale,
        payment: "bank-transfer",
      });
      window.location.assign(`/booking/requested?${params.toString()}`);
    } catch {
      setClaimError(t(locale, "bankTransferClaimFailed"));
      setIsClaiming(false);
    }
  }

  return (
    <div className="booking-payment booking-payment--bank">
      <p className="booking-payment__bank-intro">{t(locale, "bankTransferIntro")}</p>

      <div className="booking-payment__amount-due">
        <span>{t(locale, "depositDue")}</span>
        <strong>{formatMoney(stayTotal, currency)}</strong>
      </div>

      {showPromptPay ? (
        <div className="booking-payment__qr">
          {qrDataUrl ? (
            <Image
              alt={t(locale, "promptPayQrAlt")}
              className="booking-payment__qr-image"
              height={320}
              src={qrDataUrl}
              unoptimized
              width={320}
            />
          ) : qrError ? (
            <p className="form-message form-message--error" role="alert">
              {t(
                locale,
                showBankAccount
                  ? "bankTransferQrUnavailable"
                  : "bankTransferQrUnavailableNoAccount",
              )}
            </p>
          ) : (
            <p className="booking-summary__hint" aria-live="polite">
              {t(locale, "bankTransferQrLoading")}
            </p>
          )}
          <p className="booking-payment__qr-amount">{formatMoney(stayTotal, currency)}</p>
          <p className="booking-payment__qr-hint">{t(locale, "bankTransferExactAmount")}</p>
        </div>
      ) : null}

      {showBankAccount ? (
        <div className="booking-payment__account">
          <p className="booking-payment__account-title">
            {t(locale, "bankTransferAccountTitle")}
          </p>
          <dl className="booking-payment__account-details">
            <div>
              <dt>{t(locale, "bankNameLabel")}</dt>
              <dd>{bankTransfer.bankName}</dd>
            </div>
            <div>
              <dt>{t(locale, "accountNameLabel")}</dt>
              <dd>{bankTransfer.accountName}</dd>
            </div>
            <div>
              <dt>{t(locale, "accountNumberLabel")}</dt>
              <dd className="booking-payment__account-number">
                {bankTransfer.accountNumber}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {claimError ? (
        <p className="form-message form-message--error" role="alert">
          {claimError}
        </p>
      ) : null}

      <div className="booking-payment__actions">
        <button
          className="button button--primary"
          disabled={isClaiming}
          onClick={() => void handleClaim()}
          type="button"
        >
          {isClaiming ? t(locale, "bankTransferWaiting") : t(locale, "bankTransferIvePaid")}
        </button>
        <button
          className="button button--secondary"
          disabled={isClaiming}
          onClick={onSwitchToCard}
          type="button"
        >
          {t(locale, "payWithCardInstead")}
        </button>
        <button
          className="button button--quiet"
          disabled={isClaiming}
          onClick={onCancel}
          type="button"
        >
          {t(locale, "editBookingDetails")}
        </button>
      </div>
    </div>
  );
}
