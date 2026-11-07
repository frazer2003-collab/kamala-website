"use client";

import { useEffect, useId, type ReactNode } from "react";

type StaffDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function StaffDialog({ open, title, onClose, children, footer }: StaffDialogProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="staff-dialog" role="presentation">
      <button
        aria-label="Close"
        className="staff-dialog__backdrop"
        onClick={onClose}
        type="button"
      />
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className="staff-dialog__panel"
        role="dialog"
      >
        <header className="staff-dialog__head">
          <h2 id={titleId}>{title}</h2>
          <button className="button button--quiet" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="staff-dialog__body">{children}</div>
        {footer ? <footer className="staff-dialog__foot">{footer}</footer> : null}
      </div>
    </div>
  );
}
