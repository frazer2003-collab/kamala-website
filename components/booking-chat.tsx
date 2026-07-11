"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  loadGuestBookingMessages,
  loadStaffBookingMessages,
  sendGuestChatMessage,
  sendStaffChatMessage,
  type ChatActionState,
} from "@/app/chat-actions";
import type { ChatMessage } from "@/lib/booking-chat";

type BookingChatProps = {
  disabled?: boolean;
  readOnly?: boolean;
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

export function BookingChat(props: BookingChatProps) {
  const { disabled = false, readOnly = false } = props;
  const isClosed = disabled || readOnly;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [guestTitle, setGuestTitle] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

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
      if (disabled && !readOnly) {
        return;
      }

      setIsPolling(true);

      try {
        const after = initial ? undefined : (lastTimestampRef.current ?? undefined);
        const result =
          props.variant === "staff"
            ? await loadStaffBookingMessages(props.bookingId, after)
            : await loadGuestBookingMessages(props.token, after);

        if (result.error && initial) {
          setLoadError(result.error);
        }

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
            const known = new Set(current.map((message) => message.id));
            const merged = [...current];

            for (const message of result.messages) {
              if (!known.has(message.id)) {
                merged.push(message);
              }
            }

            return merged.sort(
              (left, right) =>
                new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
            );
          });

          lastTimestampRef.current =
            result.messages[result.messages.length - 1]?.createdAt ??
            lastTimestampRef.current;
        }
      } finally {
        setIsPolling(false);
      }
    },
    [disabled, readOnly, props],
  );

  useEffect(() => {
    setMessages([]);
    lastTimestampRef.current = null;
    void refreshMessages(true);
  }, [
    props.variant,
    props.variant === "staff" ? props.bookingId : props.token,
    refreshMessages,
  ]);

  useEffect(() => {
    if (disabled && !readOnly) {
      return;
    }

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
  }, [disabled, readOnly, refreshMessages]);

  useEffect(() => {
    scrollToLatest();
  }, [messages, scrollToLatest]);

  useEffect(() => {
    if (isClosed || isPending || actionState.error) {
      return;
    }

    const form = document.getElementById(
        props.variant === "staff"
          ? `staff-chat-form-${props.bookingId}`
          : `guest-chat-form-${props.token}`,
      ) as HTMLFormElement | null;

    form?.reset();
    void refreshMessages(false);
  }, [actionState.error, isClosed, isPending, props, refreshMessages]);

  return (
    <section
      aria-labelledby={
        props.variant === "staff"
          ? `staff-chat-title-${props.bookingId}`
          : "guest-chat-title"
      }
      className="booking-chat"
      id="booking-chat"
    >
      <div className="booking-chat__header">
        <div>
          <h3
            id={
              props.variant === "staff"
                ? `staff-chat-title-${props.bookingId}`
                : "guest-chat-title"
            }
          >
            Conversation
          </h3>
          {guestTitle ? <p className="booking-chat__meta">{guestTitle}</p> : null}
        </div>
        <span aria-live="polite" className="booking-chat__status">
          {isPolling ? "Checking for new messages…" : "Live"}
        </span>
      </div>

      {loadError ? (
        <p className="form-message form-message--error" role="alert">
          {loadError}
        </p>
      ) : null}

      <div
        aria-label="Message history"
        className="booking-chat__thread message-thread"
        ref={threadRef}
      >
        {messages.length === 0 ? (
          <p className="booking-chat__empty">
            {props.variant === "staff"
              ? "No messages yet. Send the first note and the guest will be notified by email."
              : "No messages yet. When Kamala writes to you, open this page to reply."}
          </p>
        ) : (
          messages.map((message) => (
            <article
              className={`message-thread__item message-thread__item--${message.sender}`}
              key={message.id}
            >
              <span>
                {message.sender === "staff" ? "Kamala" : "You"} ·{" "}
                {formatMessageTime(message.createdAt)}
              </span>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      {isClosed ? (
        <p className="booking-chat__closed">
          {readOnly
            ? "This conversation is closed. The full history is kept on record."
            : "Messaging is unavailable for this booking."}
        </p>
      ) : (
        <form
          action={submitAction}
          className="reply-form booking-chat__form"
          id={
            props.variant === "staff"
              ? `staff-chat-form-${props.bookingId}`
              : `guest-chat-form-${props.token}`
          }
        >
          {props.variant === "staff" ? (
            <input name="booking-id" type="hidden" value={props.bookingId} />
          ) : (
            <input name="token" type="hidden" value={props.token} />
          )}
          <label
            htmlFor={
              props.variant === "staff"
                ? `staff-chat-message-${props.bookingId}`
                : `guest-chat-message-${props.token}`
            }
          >
            {props.variant === "staff" ? "Message guest" : "Your message"}
          </label>
          <textarea
            disabled={isPending}
            id={
              props.variant === "staff"
                ? `staff-chat-message-${props.bookingId}`
                : `guest-chat-message-${props.token}`
            }
            name="message"
            placeholder={
              props.variant === "staff"
                ? "Arrival details, questions, or a quick update."
                : "Ask a question or share arrival details."
            }
            required
            rows={4}
          />
          {actionState.error ? (
            <p className="form-message form-message--error" role="alert">
              {actionState.error}
            </p>
          ) : null}
          <button className="button button--primary" disabled={isPending} type="submit">
            {isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}
