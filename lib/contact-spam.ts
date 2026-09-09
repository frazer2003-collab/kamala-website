/**
 * Contact-form spam gates: honeypot, timing, gibberish tokens, optional Turnstile.
 * Prefer silent success for bot traps so scrapers do not learn to adapt.
 */

export const CONTACT_HONEYPOT_FIELD = "company_website";
export const CONTACT_STARTED_AT_FIELD = "form_started_at";
export const CONTACT_TURNSTILE_FIELD = "cf-turnstile-response";

/** Minimum time a human typically needs to fill the form (ms). */
export const CONTACT_MIN_FILL_MS = 2_500;

/** Ignore / reject absurdly old timestamps (ms). */
export const CONTACT_MAX_FILL_MS = 24 * 60 * 60 * 1000;

export function isContactHoneypotTripped(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().length > 0;
}

export function readContactStartedAt(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!/^\d{10,16}$/.test(raw)) {
    return null;
  }
  const startedAt = Number(raw);
  return Number.isFinite(startedAt) ? startedAt : null;
}

export function isContactSubmittedTooFast(
  startedAt: number | null,
  now = Date.now(),
) {
  if (startedAt === null) {
    return true;
  }
  const elapsed = now - startedAt;
  if (elapsed < CONTACT_MIN_FILL_MS) {
    return true;
  }
  if (elapsed > CONTACT_MAX_FILL_MS) {
    return true;
  }
  return false;
}

/**
 * Random alphanumeric blobs bots paste into name/message fields.
 * Conservative: only flags long single tokens with mixed case.
 */
export function isLikelyRandomSpamToken(value: string) {
  const text = value.trim();
  if (text.length < 14) {
    return false;
  }
  if (/\s/.test(text)) {
    return false;
  }
  if (!/^[A-Za-z0-9]+$/.test(text)) {
    return false;
  }
  return /[a-z]/.test(text) && /[A-Z]/.test(text);
}

export function isLikelyContactSpamContent(input: {
  guestName: string;
  message: string;
}) {
  return (
    isLikelyRandomSpamToken(input.guestName) &&
    isLikelyRandomSpamToken(input.message)
  );
}

export function hasTurnstileConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() &&
      process.env.TURNSTILE_SECRET_KEY?.trim(),
  );
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return false;
  }
  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: trimmed,
  });
  if (remoteIp) {
    body.set("remoteip", remoteIp);
  }

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      },
    );
    if (!response.ok) {
      return false;
    }
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
