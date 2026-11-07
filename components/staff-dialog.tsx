"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type StaffDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Accessible + visible close control label. */
  closeLabel?: string;
};

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute("aria-hidden"));
}

export function StaffDialog({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel = "Close",
}: StaffDialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const panel = panelRef.current;
    const closeButton = closeRef.current;
    const focusable = panel ? getFocusableElements(panel) : [];
    (closeButton ?? focusable[0] ?? panel)?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const items = getFocusableElements(panelRef.current);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      }
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="staff-dialog" role="presentation">
      <button
        aria-label={closeLabel}
        className="staff-dialog__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="staff-dialog__panel"
        ref={panelRef}
        role="dialog"
      >
        <header className="staff-dialog__head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="button button--quiet"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            {closeLabel}
          </button>
        </header>
        <div className="staff-dialog__body">{children}</div>
        {footer ? <footer className="staff-dialog__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
