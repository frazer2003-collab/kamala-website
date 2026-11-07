"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

type StaffDeskActionsMenuProps = {
  label: string;
  children: ReactNode;
};

export function StaffDeskActionsMenu({
  label,
  children,
}: StaffDeskActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="staff-desk__actions-menu" ref={rootRef}>
      <button
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="menu"
        className="button button--quiet"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {label}
      </button>
      {open ? (
        <div
          className="staff-desk__actions-panel"
          id={menuId}
          role="menu"
        >
          <div
            onClick={(event) => {
              const target = event.target as HTMLElement | null;
              if (target?.closest("button, a, [role='menuitem']")) {
                setOpen(false);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                const target = event.target as HTMLElement | null;
                if (target?.closest("button, a, [role='menuitem']")) {
                  setOpen(false);
                }
              }
            }}
            role="none"
          >
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
