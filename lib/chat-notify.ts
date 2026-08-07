import type { BookingMessageRow } from "@/lib/supabase";

export type ChatMessageSender = BookingMessageRow["sender"];

/**
 * One email per unanswered streak: notify when this is the first message from
 * `sender` since the other party last spoke (or the thread is empty).
 */
export function shouldNotifyChatCounterpart(input: {
  sender: ChatMessageSender;
  /** Latest prior message in the thread, if any. */
  latestPriorSender: ChatMessageSender | null;
}) {
  if (!input.latestPriorSender) {
    return true;
  }
  return input.latestPriorSender !== input.sender;
}
