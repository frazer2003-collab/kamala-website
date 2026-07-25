"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { useCalendarStaySelection } from "@/components/calendar-stay-selection";

type CalendarStayBarLinkProps = {
  href: string;
  itemKey: string;
  kind: "booking" | "block" | "channel";
  className: string;
  ariaLabel: string;
  style?: React.CSSProperties;
  children: ReactNode;
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
}: CalendarStayBarLinkProps) {
  const staySelection = useCalendarStaySelection();

  if (!staySelection) {
    return (
      <Link
        aria-label={ariaLabel}
        className={className}
        data-calendar-focus={itemKey}
        href={href}
        style={style}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      aria-label={ariaLabel}
      className={className}
      data-calendar-focus={itemKey}
      href={href}
      onClick={(event) => {
        if (isModifiedClick(event)) {
          return;
        }

        event.preventDefault();
        if (kind === "booking") {
          staySelection.selectBooking(itemKey);
        } else {
          staySelection.selectBlock(itemKey);
        }
      }}
      style={style}
    >
      {children}
    </a>
  );
}
