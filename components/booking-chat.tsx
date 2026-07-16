"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  loadGuestBookingMessages,
  loadStaffBookingMessages,
  sendGuestChatMessage,
  sendStaffChatMessage,
  type ChatActionState,
} from "@/app/chat-actions";
import type { ChatMessage } from "@/lib/booking-chat";

type BookingChatProps = {
  /** When true, compose is blocked. History still loads. */
  disabled?: boolean;
  readOnly?: boolean;
  /** When false, skip the Conversation heading (e.g. staff detail already labels the block). */
  showHeading?: boolean;
  /** Staff view: label for guest-authored messages (defaults to "Guest"). */
  guestLabel?: string;
} & (
  | {
      variant: "staff";
      bookingId: string;
    }
  | {
      variant: "guest";
      token: string;
    }
);

const initialActionState: ChatActionState = {};

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatSyncTime(value: number | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const known = new Set(current.map((message) => message.id));
  const merged = [...current];

  for (const message of incoming) {
    if (!known.has(message.id)) {
      merged.push(message);
      known.add(message.id);
    }
  }

  return merged.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function BookingChat(props: BookingChatProps) {
  const {
    disabled = false,
    readOnly = false,
    showHeading = true,
    guestLabel = "Guest",
  } = props;
  const canCompose = !disabled && !readOnly;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [guestTitle, setGuestTitle] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const lastSentAtRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const messageCountRef = useRef(0);
  const formId = useId();
  const textareaId = useId();

  const [actionState, submitAction, isPending] = useActionState(
    props.variant === "staff" ? sendStaffChatMessage : sendGuestChatMessage,
    initialActionState,
  );

  const scrollToLatest = useCallback(() => {
    const node = threadRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, []);

  const refreshMessages = useCallback(
    async (initial = false) => {
      setIsPolling(true);

      try {
        const after = initial ? undefined : (lastTimestampRef.current ?? undefined);
        const result =
          props.variant === "staff"
            ? await loadStaffBookingMessages(props.bookingId, after)
            : await loadGuestBookingMessages(props.token, after);

        if (result.error) {
          if (initial) {
            setLoadError(result.error);
          } else {
            setPollError("Could not refresh messages.");
          }
          return;
        }

        setLoadError(null);
        setPollError(null);
        setLastSyncedAt(Date.now());

        if (props.variant === "guest") {
          const guestResult = result as Awaited<
            ReturnType<typeof loadGuestBookingMessages>
          >;
          if (guestResult.context) {
            setGuestTitle(
              `${guestResult.context.roomName} · ${guestResult.context.arrivalDate} to ${guestResult.context.departureDate}`,
            );
          }
        }

        if (result.messages.length > 0) {
          setMessages((current) => {
            const next = mergeMessages(current, result.messages);
            lastTimestampRef.current =
              next[next.length - 1]?.createdAt ?? lastTimestampRef.current;
            return next;
          });
        } else if (initial) {
          lastTimestampRef.current = null;
        }
      } finally {
        setIsPolling(false);
      }
    },
    [props],
  );

  useEffect(() => {
    setMessages([]);
    lastTimestampRef.current = null;
    messageCountRef.current = 0;
    setSendStatus(null);
    setPollError(null);
    void refreshMessages(true);
  }, [
    props.variant,
    props.variant === "staff" ? props.bookingId : props.token,
    refreshMessages,
  ]);

  useEffect(() => {
    function getPollInterval() {
      return document.visibilityState === "visible" ? 5000 : 20000;
    }

    let intervalId = window.setInterval(() => {
      void refreshMessages(false);
    }, getPollInterval());

    function handleVisibilityChange() {
      window.clearInterval(intervalId);
      intervalId = window.setInterval(() => {
        void refreshMessages(false);
      }, getPollInterval());

      if (document.visibilityState === "visible") {
        void refreshMessages(false);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshMessages]);

  useEffect(() => {
    scrollToLatest();
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (messages.length > messageCountRef.current) {
      const newest = messages[messages.length - 1];
      if (newest) {
        const who =
          newest.sender === "staff"
            ? "Kamala"
            : props.variant === "staff"
              ? guestLabel
              : "You";
        setLiveAnnouncement(`New message from ${who}`);
      }
    }
    messageCountRef.current = messages.length;
  }, [guestLabel, messages, props.variant]);

  useEffect(() => {
    if (actionState.error) {
      submittingRef.current = false;
    }
  }, [actionState.error]);

  useEffect(() => {
    if (!actionState.sentAt || actionState.sentAt === lastSentAtRef.current) {
      return;
    }

    lastSentAtRef.current = actionState.sentAt;
    submittingRef.current = false;

    if (actionState.message) {
      setMessages((current) => {
        const next = mergeMessages(current, [actionState.message!]);
        lastTimestampRef.current =
          next[next.length - 1]?.createdAt ?? lastTimestampRef.current;
        return next;
      });
      setDraft("");
      if (actionState.emailSent === false) {
        setSendStatus("Saved · email failed");
      } else if (props.variant === "staff" && actionState.emailSent === true) {
        setSendStatus("Saved · guest notified");
      } else if (props.variant === "guest") {
        setSendStatus("Saved · Kamala will see your message");
      } else {
        setSendStatus("Saved");
      }
    }
  }, [actionState, props.variant]);

  useEffect(() => {
    if (!sendStatus) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSendStatus(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [sendStatus]);

  function senderLabel(sender: ChatMessage["sender"]) {
    if (sender === "staff") {
      return "Kamala";
    }

    return props.variant === "staff" ? guestLabel : "You";
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (submittingRef.current || isPending || !canCompose) {
      event.preventDefault();
      return;
    }

    const trimmed = draft.trim();
    if (!trimmed) {
      event.preventDefault();
      return;
    }

    submittingRef.current = true;
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      if (!canCompose || isPending || submittingRef.current || !draft.trim()) {
        return;
      }

      event.currentTarget.form?.requestSubmit();
    }
  }

  const syncedLabel = formatSyncTime(lastSyncedAt);
  const statusLabel = isPolling
    ? "Checking for new messages…"
    : syncedLabel
      ? `Last checked ${syncedLabel}`
      : "Updates every few seconds";

  const headingId =
    props.variant === "staff"
      ? `staff-chat-title-${props.bookingId}`
      : "guest-chat-title";

  return (
    <section
      aria-label={showHeading ? undefined : "Conversation"}
      aria-labelledby={showHeading ? headingId : undefined}
      className="booking-chat"
      id="booking-chat"
    >
      <div className="booking-chat__header">
        <div>
          {showHeading ? <h3 id={headingId}>Conversation</h3> : null}
          {guestTitle ? <p className="booking-chat__meta">{guestTitle}</p> : null}
        </div>
        <span aria-live="polite" className="booking-chat__status">
          {statusLabel}
        </span>
      </div>

      <p className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </p>

      {loadError ? (
        <p className="form-message form-message--error" role="alert">
          {loadError}
          <button
            className="button button--quiet booking-chat__retry"
            onClick={() => void refreshMessages(true)}
            type="button"
          >
            Retry
          </button>
        </p>
      ) : null}

      {pollError ? (
        <p className="form-message form-message--error" role="alert">
          {pollError}
          <button
            className="button button--quiet booking-chat__retry"
            onClick={() => void refreshMessages(false)}
            type="button"
          >
            Retry
          </button>
        </p>
      ) : null}

      <div
        aria-label="Message history"
        className="booking-chat__thread message-thread"
        ref={threadRef}
      >
        {messages.length === 0 && !loadError ? (
          <p className="booking-chat__empty">
            {props.variant === "staff"
              ? "No messages yet. Send the first note and the guest will be notified by email."
              : "No messages yet. Write Kamala a note — your message is saved with this reservation, and they will email you when they reply."}
          </p>
        ) : (
          messages.map((message) => (
            <article
              className={`message-thread__item message-thread__item--${message.sender}`}
              key={message.id}
            >
              <span>
                {senderLabel(message.sender)} ·{" "}
                {formatMessageTime(message.createdAt)}
              </span>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      {!canCompose ? (
        <p className="booking-chat__closed">
          {readOnly
            ? "This conversation is closed. The full history is kept on record."
            : "Messaging is unavailable for this booking. History above stays readable."}
        </p>
      ) : (
        <form
          action={submitAction}
          className="reply-form booking-chat__form"
          id={formId}
          onSubmit={handleFormSubmit}
        >
          {props.variant === "staff" ? (
            <input name="booking-id" type="hidden" value={props.bookingId} />
          ) : (
            <input name="token" type="hidden" value={props.token} />
          )}
          <label htmlFor={textareaId}>
            {props.variant === "staff" ? "Message guest" : "Your message"}
          </label>
          <textarea
            disabled={isPending}
            id={textareaId}
            name="message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder={
              props.variant === "staff"
                ? "Arrival details, questions, or a quick update."
                : "Ask a question or share arrival details."
            }
            required
            rows={4}
            value={draft}
          />
          <p className="booking-chat__compose-hint">
            Press Ctrl+Enter or ⌘Enter to send.
          </p>
          {actionState.error ? (
            <p className="form-message form-message--error" role="alert">
              {actionState.error}
            </p>
          ) : null}
          {sendStatus ? (
            <p
              className={`form-message${
                sendStatus.includes("email failed")
                  ? " form-message--error"
                  : " form-message--setup"
              }`}
              role="status"
            >
              {sendStatus}
            </p>
          ) : null}
          <button
            className="button button--primary"
            disabled={isPending || !draft.trim()}
            type="submit"
          >
            {isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}
