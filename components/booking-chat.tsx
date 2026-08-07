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
import {
  playChatAlertSound,
  unlockChatAlertSound,
} from "@/lib/chat-alert-sound";

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
const NEAR_BOTTOM_PX = 80;

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

function isNearBottom(node: HTMLDivElement) {
  return node.scrollHeight - node.scrollTop - node.clientHeight <= NEAR_BOTTOM_PX;
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const lastSentAtRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const hydratedRef = useRef(false);
  const stickToBottomRef = useRef(true);
  const loadGenerationRef = useRef(0);
  const messageCountRef = useRef(0);
  const formId = useId();
  const textareaId = useId();
  const threadId = useId();

  const [actionState, submitAction, isPending] = useActionState(
    props.variant === "staff" ? sendStaffChatMessage : sendGuestChatMessage,
    initialActionState,
  );

  const scrollToLatest = useCallback((force = false) => {
    const node = threadRef.current;
    if (!node) {
      return;
    }

    if (!force && !stickToBottomRef.current) {
      return;
    }

    node.scrollTop = node.scrollHeight;
    stickToBottomRef.current = true;
  }, []);

  const refreshMessages = useCallback(
    async (initial = false) => {
      const generation = initial
        ? ++loadGenerationRef.current
        : loadGenerationRef.current;

      if (initial) {
        setIsInitialLoading(true);
      }

      try {
        const after = initial ? undefined : (lastTimestampRef.current ?? undefined);
        const result =
          props.variant === "staff"
            ? await loadStaffBookingMessages(props.bookingId, after)
            : await loadGuestBookingMessages(props.token, after);

        if (generation !== loadGenerationRef.current) {
          return;
        }

        if (result.error) {
          if (initial) {
            setLoadError(result.error);
            setIsInitialLoading(false);
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

        if (initial) {
          hydratedRef.current = true;
          setIsInitialLoading(false);
          queueMicrotask(() => scrollToLatest(true));
        }
      } catch {
        if (generation !== loadGenerationRef.current) {
          return;
        }

        if (initial) {
          setLoadError("Could not load messages.");
          setIsInitialLoading(false);
        } else {
          setPollError("Could not refresh messages.");
        }
      }
    },
    [props, scrollToLatest],
  );

  useEffect(() => {
    loadGenerationRef.current += 1;
    hydratedRef.current = false;
    stickToBottomRef.current = true;
    setMessages([]);
    lastTimestampRef.current = null;
    messageCountRef.current = 0;
    setSendStatus(null);
    setPollError(null);
    setLoadError(null);
    setGuestTitle(null);
    setLiveAnnouncement("");
    void refreshMessages(true);
  }, [
    props.variant,
    props.variant === "staff" ? props.bookingId : props.token,
    refreshMessages,
  ]);

  useEffect(() => {
    // Visible tabs: gentle poll. Hidden tabs: stop entirely (refresh on focus).
    const VISIBLE_POLL_MS = 8000;
    let intervalId: number | null = null;

    function stopPolling() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function startPolling() {
      stopPolling();
      if (document.visibilityState !== "visible") {
        return;
      }
      intervalId = window.setInterval(() => {
        void refreshMessages(false);
      }, VISIBLE_POLL_MS);
    }

    startPolling();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshMessages(false);
        startPolling();
      } else {
        stopPolling();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      loadGenerationRef.current += 1;
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshMessages]);

  // Unlock audio on first gesture so later alerts can play.
  useEffect(() => {
    function unlock() {
      void unlockChatAlertSound();
    }
    document.addEventListener("pointerdown", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (props.variant !== "guest") {
      return;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return;
    }

    const syncKeyboardOffset = () => {
      const obscured = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--booking-chat-keyboard-offset",
        `${obscured}px`,
      );
    };

    syncKeyboardOffset();
    viewport.addEventListener("resize", syncKeyboardOffset);
    viewport.addEventListener("scroll", syncKeyboardOffset);

    return () => {
      viewport.removeEventListener("resize", syncKeyboardOffset);
      viewport.removeEventListener("scroll", syncKeyboardOffset);
      document.documentElement.style.removeProperty("--booking-chat-keyboard-offset");
    };
  }, [props.variant]);

  useEffect(() => {
    if (!hydratedRef.current) {
      messageCountRef.current = messages.length;
      return;
    }

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
        scrollToLatest(false);

        const fromOther =
          (props.variant === "staff" && newest.sender === "guest") ||
          (props.variant === "guest" && newest.sender === "staff");
        if (
          fromOther &&
          typeof document !== "undefined" &&
          document.visibilityState === "visible"
        ) {
          void playChatAlertSound();
        }
      }
    }
    messageCountRef.current = messages.length;
  }, [guestLabel, messages, props.variant, scrollToLatest]);

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
      stickToBottomRef.current = true;
      setMessages((current) => {
        const next = mergeMessages(current, [actionState.message!]);
        lastTimestampRef.current =
          next[next.length - 1]?.createdAt ?? lastTimestampRef.current;
        return next;
      });
      setDraft("");
      queueMicrotask(() => scrollToLatest(true));
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
  }, [actionState, props.variant, scrollToLatest]);

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

  function handleThreadScroll() {
    const node = threadRef.current;
    if (!node) {
      return;
    }
    stickToBottomRef.current = isNearBottom(node);
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

  function handleTextareaFocus() {
    if (props.variant !== "guest") {
      return;
    }

    queueMicrotask(() => {
      formRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }

  const syncedLabel = formatSyncTime(lastSyncedAt);
  const statusLabel = isInitialLoading
    ? "Loading messages…"
    : syncedLabel
      ? `Updated ${syncedLabel}`
      : "Updates every few seconds";

  const headingId =
    props.variant === "staff"
      ? `staff-chat-title-${props.bookingId}`
      : "guest-chat-title";

  return (
    <section
      aria-label={showHeading ? undefined : "Conversation"}
      aria-labelledby={showHeading ? headingId : undefined}
      className={`booking-chat${
        props.variant === "guest" ? " booking-chat--guest" : ""
      }`}
      id="booking-chat"
    >
      <div className="booking-chat__header">
        <div>
          {showHeading ? <h3 id={headingId}>Conversation</h3> : null}
          {guestTitle ? <p className="booking-chat__meta">{guestTitle}</p> : null}
        </div>
        <span className="booking-chat__status">{statusLabel}</span>
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
        aria-relevant="additions"
        className="booking-chat__thread message-thread"
        id={threadId}
        onScroll={handleThreadScroll}
        ref={threadRef}
        role="log"
      >
        {messages.length === 0 && !loadError ? (
          <p className="booking-chat__empty">
            {isInitialLoading
              ? "Loading messages…"
              : props.variant === "staff"
                ? "No messages yet. Send the first note; the guest is notified by email."
                : "No messages yet. Write Kamala a note — your message stays with this reservation."}
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
            ? "This conversation is closed. The full history stays on your booking record."
            : "Messaging is unavailable for this booking. History above stays readable."}
        </p>
      ) : (
        <form
          action={submitAction}
          className="reply-form booking-chat__form"
          id={formId}
          onSubmit={handleFormSubmit}
          ref={formRef}
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
            onFocus={handleTextareaFocus}
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
