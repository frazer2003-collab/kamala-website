"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeStaffConversation } from "@/app/chat-actions";
import "@/app/staff-close-conversation.css";

type StaffCloseConversationProps = {
  bookingId: string;
  disabled?: boolean;
  /** Called after history is cleared so the chat island can empty locally. */
  onClosed?: () => void;
};

/**
 * Finishes a guest conversation without a confirmation email:
 * clears needs-reply and deletes message history.
 */
export function StaffCloseConversation({
  bookingId,
  disabled = false,
  onClosed,
}: StaffCloseConversationProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (disabled) {
    return null;
  }

  if (!confirming) {
    return (
      <div className="staff-close-conversation">
        <button
          className="button button--quiet"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          type="button"
        >
          Close conversation…
        </button>
      </div>
    );
  }

  return (
    <div className="staff-close-conversation staff-close-conversation--confirm" role="group" aria-label="Close conversation">
      <p>
        Close this conversation? Message history is deleted and Need reply is
        cleared. The guest is not emailed.
      </p>
      {error ? (
        <p className="form-message form-message--error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="staff-close-conversation__actions">
        <button
          className="button button--primary"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await closeStaffConversation(bookingId);
              if (!result.ok) {
                setError(result.error ?? "Could not close the conversation.");
                return;
              }
              onClosed?.();
              setConfirming(false);
              router.refresh();
            });
          }}
          type="button"
        >
          {pending ? "Closing…" : "Close and clear history"}
        </button>
        <button
          className="button button--quiet"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          type="button"
        >
          Keep open
        </button>
      </div>
    </div>
  );
}
