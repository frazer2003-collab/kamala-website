/**
 * Best-effort in-memory rate limit for contact form posts.
 * On serverless each instance has its own map — still blocks burst spam.
 */

const hits = new Map<string, number[]>();

export const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const CONTACT_RATE_LIMIT_MAX = 5;

function prune(timestamps: number[], now: number) {
  return timestamps.filter((at) => now - at < CONTACT_RATE_LIMIT_WINDOW_MS);
}

export function resetContactRateLimitForTests() {
  hits.clear();
}

export function checkContactRateLimit(
  key: string,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfterSec: number } {
  const normalized = key.trim() || "unknown";
  const recent = prune(hits.get(normalized) ?? [], now);

  if (recent.length >= CONTACT_RATE_LIMIT_MAX) {
    const oldest = recent[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((CONTACT_RATE_LIMIT_WINDOW_MS - (now - oldest)) / 1000),
    );
    hits.set(normalized, recent);
    return { ok: false, retryAfterSec };
  }

  recent.push(now);
  hits.set(normalized, recent);
  return { ok: true };
}

export function clientIpFromHeaders(headerList: Headers) {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}
