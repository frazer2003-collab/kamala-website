"use server";

import { headers } from "next/headers";
import { sendStaffContactMessageEmail } from "@/lib/email";
import {
  checkContactRateLimit,
  clientIpFromHeaders,
} from "@/lib/contact-rate-limit";
import {
  emptyContactMessageValues,
  normalizeContactMessageValues,
  validateContactMessage,
  type ContactFormState,
  type ContactMessageValues,
} from "@/lib/contact-message";
import {
  CONTACT_HONEYPOT_FIELD,
  CONTACT_STARTED_AT_FIELD,
  CONTACT_TURNSTILE_FIELD,
  hasTurnstileConfigured,
  isContactHoneypotTripped,
  isContactSubmittedTooFast,
  isLikelyContactSpamContent,
  readContactStartedAt,
  verifyTurnstileToken,
} from "@/lib/contact-spam";
import { getPropertySettings } from "@/lib/property-settings";

function readContactValues(formData: FormData): ContactMessageValues {
  return {
    guestName: String(formData.get("guest-name") ?? ""),
    guestEmail: String(formData.get("guest-email") ?? ""),
    guestPhone: String(formData.get("guest-phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
}

function silentSuccess(): ContactFormState {
  return {
    status: "success",
    message: "Message sent. We’ll reply by email as soon as we can.",
    values: emptyContactMessageValues(),
  };
}

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = readContactValues(formData);

  if (isContactHoneypotTripped(formData.get(CONTACT_HONEYPOT_FIELD))) {
    return silentSuccess();
  }

  const startedAt = readContactStartedAt(formData.get(CONTACT_STARTED_AT_FIELD));
  if (isContactSubmittedTooFast(startedAt)) {
    return silentSuccess();
  }

  if (
    isLikelyContactSpamContent({
      guestName: raw.guestName,
      message: raw.message,
    })
  ) {
    return silentSuccess();
  }

  const headerList = await headers();
  const ip = clientIpFromHeaders(headerList);
  const rate = checkContactRateLimit(`contact:${ip}`);
  if (!rate.ok) {
    return {
      status: "error",
      message:
        "Too many messages from this connection. Please wait a few minutes and try again, or use LINE / WhatsApp / telephone.",
      values: raw,
    };
  }

  if (hasTurnstileConfigured()) {
    const token = String(formData.get(CONTACT_TURNSTILE_FIELD) ?? "");
    const ok = await verifyTurnstileToken(token, ip === "unknown" ? null : ip);
    if (!ok) {
      return {
        status: "error",
        message: "Please confirm you are human, then try again.",
        values: raw,
      };
    }
  }

  const values = normalizeContactMessageValues(raw);
  const fieldErrors = validateContactMessage(raw);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: "error",
      message: "Check the highlighted fields and try again.",
      fieldErrors,
      values: raw,
    };
  }

  const settings = await getPropertySettings();
  const to = settings.contactEmail?.trim() ?? "";

  if (!to) {
    return {
      status: "error",
      message:
        "Email contact is not set up yet. Please use LINE, WhatsApp, or telephone if they are listed beside the form.",
      values,
    };
  }

  const result = await sendStaffContactMessageEmail({
    propertyName: settings.propertyName,
    to,
    guestName: values.guestName,
    guestEmail: values.guestEmail,
    guestPhone: values.guestPhone,
    message: values.message,
  });

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "missing-config"
          ? "Email contact is temporarily unavailable. Please try LINE, WhatsApp, or telephone, or try again later."
          : "We could not send your message. Please try again, or use LINE, WhatsApp, or telephone.",
      values,
    };
  }

  return {
    status: "success",
    message: "Message sent. We’ll reply by email as soon as we can.",
    values: emptyContactMessageValues(),
  };
}
