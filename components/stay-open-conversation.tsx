"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BookingChat } from "@/components/staff-lazy";
import "@/app/staff-stay-conversation.css";

type StayOpenConversationProps = {
  bookingId: string;
  hasGuestEmail: boolean;
  guestLabel: string;
  canManage: boolean;
  readOnly: boolean;
  /** Open immediately when staff already owe a reply. */
  priority: boolean;
};

export function StayOpenConversation({
  bookingId,
  hasGuestEmail,
  guestLabel,
  canManage,
  readOnly,
  priority,
}: StayOpenConversationProps) {
  const hintId = useId();
  const chatRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(priority && hasGuestEmail);

  useEffect(() => {
    if (!hasGuestEmail) {
      setOpen(false);
    } else if (priority) {
      setOpen(true);
    }
  }, [bookingId, hasGuestEmail, priority]);

  useEffect(() => {
    if (!open || !chatRef.current) {
      return;
    }

    const node = chatRef.current;
    node.scrollIntoView({ block: "nearest", behavior: "auto" });
    const compose = node.querySelector<HTMLElement>(
      "textarea:not([disabled]), [contenteditable='true']",
    );
    compose?.focus({ preventScroll: true });
  }, [open]);

  function handleToggle() {
    if (!hasGuestEmail) {
      return;
    }
    setOpen((current) => !current);
  }

  return (
    <div className="reservation-detail__conversation">
      <div className="reservation-detail__conversation-launch">
        <button
          aria-controls="booking-chat"
          aria-describedby={hasGuestEmail ? undefined : hintId}
          aria-expanded={open}
          className={`button button--secondary reservation-detail__conversation-button${
            open ? " reservation-detail__conversation-button--open" : ""
          }`}
          disabled={!hasGuestEmail}
          onClick={handleToggle}
          type="button"
        >
          {open ? "Hide conversation" : "Open conversation"}
        </button>
        {!hasGuestEmail ? (
          <p className="detail-help" id={hintId}>
            Add and save a guest email below to open Conversation.
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          className={`staff-request-chat${
            priority ? " staff-request-chat--priority" : ""
          }`}
          id="booking-chat"
          ref={chatRef}
          tabIndex={-1}
        >
          <h3 className="staff-request-chat__title">
            {priority ? "Conversation — reply needed" : "Conversation"}
          </h3>
          <BookingChat
            bookingId={bookingId}
            disabled={!canManage}
            guestLabel={guestLabel}
            readOnly={readOnly}
            showHeading={false}
            variant="staff"
          />
        </div>
      ) : null}
    </div>
  );
}
