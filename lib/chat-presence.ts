/** How long a heartbeat keeps the viewer “on the chat page”. */
export const CHAT_PRESENCE_TTL_MS = 45_000;

export type ChatViewerRole = "guest" | "staff";

/** True when last_seen is recent enough that email should be skipped. */
export function isChatViewerPresent(
  lastSeenAt: string | null | undefined,
  nowMs: number = Date.now(),
  ttlMs: number = CHAT_PRESENCE_TTL_MS,
) {
  if (!lastSeenAt) {
    return false;
  }
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) {
    return false;
  }
  return nowMs - seen <= ttlMs;
}
