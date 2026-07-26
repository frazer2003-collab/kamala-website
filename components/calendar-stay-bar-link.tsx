"use client";

import Link from "next/link";
import { useRef, type DragEvent, type MouseEvent, type ReactNode } from "react";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";
import type { StaffTapeMovePayload } from "@/lib/staff-calendar-tape-move";

type CalendarStayBarLinkProps = {
  href: string;
  itemKey: string;
  kind: "booking" | "block" | "channel";
  className: string;
  ariaLabel: string;
  style?: React.CSSProperties;
  children: ReactNode;
  /** When set, the bar can be dragged onto a door row to assign/move. */
  movePayload?: StaffTapeMovePayload | null;
  onMoveDragStart?: (payload: StaffTapeMovePayload, event: DragEvent) => void;
  onMoveDragEnd?: () => void;
};

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/** Stay bar that opens details instantly via client state when available. */
export function CalendarStayBarLink({
  href,
  itemKey,
  kind,
  className,
  ariaLabel,
  style,
  children,
  movePayload,
  onMoveDragStart,
  onMoveDragEnd,
}: CalendarStayBarLinkProps) {
  const staySelection = useCalendarStaySelection();
  const didDragRef = useRef(false);
  const draggable = Boolean(movePayload && onMoveDragStart);

  const dragProps = draggable
    ? {
        draggable: true as const,
        onDragStart: (event: DragEvent<HTMLAnchorElement>) => {
          if (!movePayload || !onMoveDragStart) {
            return;
          }
          didDragRef.current = true;
          onMoveDragStart(movePayload, event);
        },
        onDragEnd: () => {
          onMoveDragEnd?.();
          // Clear after the synthetic click that follows a drag in some browsers.
          window.setTimeout(() => {
            didDragRef.current = false;
          }, 0);
        },
      }
    : {};

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (didDragRef.current) {
      event.preventDefault();
      return;
    }
    if (!staySelection || isModifiedClick(event)) {
      return;
    }
    event.preventDefault();
    if (kind === "booking") {
      staySelection.selectBooking(itemKey);
    } else {
      staySelection.selectBlock(itemKey);
    }
  };

  if (!staySelection) {
    return (
      <Link
        aria-label={ariaLabel}
        className={className}
        data-calendar-focus={itemKey}
        href={href}
        style={style}
        title={draggable ? `${ariaLabel}. Drag onto a door row to assign.` : ariaLabel}
        {...dragProps}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      aria-label={
        draggable ? `${ariaLabel}. Drag onto a door row to assign or move.` : ariaLabel
      }
      className={className}
      data-calendar-focus={itemKey}
      href={href}
      onClick={handleClick}
      style={style}
      title={draggable ? "Drag onto a door row to assign or move" : undefined}
      {...dragProps}
    >
      {children}
    </a>
  );
}
