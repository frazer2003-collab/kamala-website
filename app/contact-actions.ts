"use server";

import { sendStaffContactMessageEmail } from "@/lib/email";
import {
  emptyContactMessageValues,
  normalizeContactMessageValues,
  validateContactMessage,
  type ContactMessageFieldErrors,
  type ContactMessageValues,
} from "@/lib/contact-message";
import { getPropertySettings } from "@/lib/property-settings";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: ContactMessageFieldErrors;
  values: ContactMessageValues;
};

export function initialContactFormState(): ContactFormState {
  return {
    status: "idle",
    message: "",
    values: emptyContactMessageValues(),
  };
}

function readContactValues(formData: FormData): ContactMessageValues {
  return {
    guestName: String(formData.get("guest-name") ?? ""),
    guestEmail: String(formData.get("guest-email") ?? ""),
    guestPhone: String(formData.get("guest-phone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
}

export async function sendContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = readContactValues(formData);
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
