"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CalendarBookingDialogProps = {
  open: boolean;
  closeHref: string;
  title: string;
  children: React.ReactNode;
};

export function CalendarBookingDialog({
  open,
  closeHref,
  title,
  children,
}: CalendarBookingDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    dialogRef.current?.scrollTo({ top: 0 });
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        router.push(closeHref);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeHref, open, router, title]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div className="calendar-dialog" ref={dialogRef}>
      <button
        aria-label="Close dialog"
        className="calendar-dialog__backdrop"
        onClick={() => router.push(closeHref)}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="calendar-dialog__panel reservation-detail"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className="calendar-dialog__header">
          <h2 className="calendar-dialog__title" id={titleId}>
            {title}
          </h2>
          <button
            className="button button--quiet calendar-dialog__close"
            onClick={() => router.push(closeHref)}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
