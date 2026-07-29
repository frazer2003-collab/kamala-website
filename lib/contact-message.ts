export const CONTACT_MESSAGE_MAX_LENGTH = 2000;
export const CONTACT_NAME_MAX_LENGTH = 120;
export const CONTACT_PHONE_MAX_LENGTH = 30;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ContactMessageValues = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  message: string;
};

export type ContactMessageFieldErrors = Partial<
  Record<"guestName" | "guestEmail" | "guestPhone" | "message", string>
>;

export function emptyContactMessageValues(): ContactMessageValues {
  return {
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    message: "",
  };
}

export function isValidContactEmail(value: string) {
  return emailPattern.test(value.trim().toLowerCase());
}

export function isValidContactPhone(value: string) {
  if (!value.trim()) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 && value.length <= CONTACT_PHONE_MAX_LENGTH;
}

export function validateContactMessage(
  values: ContactMessageValues,
): ContactMessageFieldErrors {
  const errors: ContactMessageFieldErrors = {};
  const name = values.guestName.trim();
  const email = values.guestEmail.trim().toLowerCase();
  const phone = values.guestPhone.trim();
  const message = values.message.trim();

  if (!name) {
    errors.guestName = "Enter your name.";
  } else if (name.length > CONTACT_NAME_MAX_LENGTH) {
    errors.guestName = `Keep your name under ${CONTACT_NAME_MAX_LENGTH} characters.`;
  }

  if (!email) {
    errors.guestEmail = "Enter an email we can reply to.";
  } else if (!isValidContactEmail(email)) {
    errors.guestEmail = "Enter a valid email address.";
  }

  if (!isValidContactPhone(phone)) {
    errors.guestPhone = "Phone needs 7+ digits, or leave blank.";
  }

  if (!message) {
    errors.message = "Write a short message.";
  } else if (message.length > CONTACT_MESSAGE_MAX_LENGTH) {
    errors.message = `Keep your message under ${CONTACT_MESSAGE_MAX_LENGTH} characters.`;
  }

  return errors;
}

export function normalizeContactMessageValues(
  values: ContactMessageValues,
): ContactMessageValues {
  return {
    guestName: values.guestName.trim().slice(0, CONTACT_NAME_MAX_LENGTH),
    guestEmail: values.guestEmail.trim().toLowerCase(),
    guestPhone: values.guestPhone.trim().slice(0, CONTACT_PHONE_MAX_LENGTH),
    message: values.message.trim().slice(0, CONTACT_MESSAGE_MAX_LENGTH),
  };
}
