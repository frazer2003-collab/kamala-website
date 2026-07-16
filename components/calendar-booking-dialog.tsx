"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CalendarBookingDialogProps = {
  open: boolean;
  closeHref: string;
  title: string;
  /** Timeline bar/cell key to refocus after close (deep links + Escape). */
  focusReturnKey?: string;
  children: React.ReactNode;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}

function restoreCalendarFocus(previous: HTMLElement | null, returnKey?: string) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (returnKey) {
        const target = document.querySelector<HTMLElement>(
          `[data-calendar-focus="${CSS.escape(returnKey)}"]`,
        );
        if (target?.isConnected) {
          target.focus();
          return;
        }
      }

      if (previous?.isConnected) {
        previous.focus();
      }
    });
  });
}

function useDesktopDrawer() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 920px)");
    function sync() {
      setIsDesktop(media.matches);
    }

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function CalendarBookingDialog({
  open,
  closeHref,
  title,
  focusReturnKey,
  children,
}: CalendarBookingDialogProps) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const returnKeyRef = useRef(focusReturnKey);
  const [mounted, setMounted] = useState(false);
  const isDesktopDrawer = useDesktopDrawer();

  returnKeyRef.current = focusReturnKey;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const shell = document.querySelector<HTMLElement>(".staff-shell");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Mobile modal: inert the shell. Desktop drawer: keep the timeline visible
    // (not interactive under the light backdrop) without fully blanking context.
    if (!isDesktopDrawer) {
      shell?.setAttribute("inert", "");
    }

    dialogRef.current?.scrollTo({ top: 0 });

    const panel = panelRef.current;
    if (panel) {
      const firstField = panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      const focusable = getFocusableElements(panel);
      (firstField ?? focusable[0] ?? panel).focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.push(closeHref);
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = getFocusableElements(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      shell?.removeAttribute("inert");
      window.removeEventListener("keydown", handleKeyDown);
      restoreCalendarFocus(previousFocusRef.current, returnKeyRef.current);
    };
  }, [closeHref, isDesktopDrawer, open, router]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={`calendar-dialog${isDesktopDrawer ? " calendar-dialog--drawer" : ""}`}
      ref={dialogRef}
    >
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
