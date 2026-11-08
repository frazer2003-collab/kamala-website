"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelGuestBooking } from "@/app/booking/change/actions";

export function GuestConversationActions({
  changeHref,
  canModify,
  canCancel,
  token,
}: {
  changeHref: string;
  canModify: boolean;
  canCancel: boolean;
  token: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  if (cancelled) {
    return (
      <p className="booking-chat-page__actions-note" role="status">
        Your booking is cancelled. A refund is on the way if you paid.
      </p>
    );
  }

  if (!canModify && !canCancel) {
    return null;
  }

  function onCancel() {
    const ok = window.confirm(
      "Cancel this booking? More than 3 days before check-in you get a full refund of your stay payment (card/bank processing fees are kept).",
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelGuestBooking(token);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCancelled(true);
      router.refresh();
    });
  }

  return (
    <div className="booking-chat-page__actions">
      {canModify ? (
        <Link className="button button--primary" href={changeHref} prefetch={false}>
          Modify your booking
        </Link>
      ) : null}
      {canCancel ? (
        <button
          className="button button--secondary"
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          {pending ? "Cancelling…" : "Cancel booking"}
        </button>
      ) : null}
      {error ? (
        <p className="booking-chat-page__actions-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
