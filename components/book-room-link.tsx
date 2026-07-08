"use client";

import type { ReactNode } from "react";

export const SELECT_ROOM_EVENT = "kamala:select-room";
export const SELECT_ROOM_STORAGE_KEY = "kamala:select-room";

export type SelectRoomDetail = {
  roomId: string;
  arrival?: string;
  departure?: string;
};

type BookRoomLinkProps = {
  roomId: string;
  className?: string;
  arrival?: string;
  departure?: string;
  onNavigate?: () => void;
  children?: ReactNode;
};

export function BookRoomLink({
  roomId,
  className,
  arrival,
  departure,
  onNavigate,
  children = "Book",
}: BookRoomLinkProps) {
  return (
    <a
      className={className}
      href="#booking"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        const detail: SelectRoomDetail = { roomId, arrival, departure };

        try {
          sessionStorage.setItem(SELECT_ROOM_STORAGE_KEY, JSON.stringify(detail));
        } catch {
          // Private mode may block sessionStorage.
        }

        const params = new URLSearchParams(window.location.search);
        params.set("room", roomId);
        if (arrival) {
          params.set("arrival", arrival);
        }
        if (departure) {
          params.set("departure", departure);
        }

        window.dispatchEvent(
          new CustomEvent(SELECT_ROOM_EVENT, {
            detail,
          }),
        );
        onNavigate?.();
        window.history.replaceState(null, "", `/?${params.toString()}#booking`);
        document.getElementById("booking")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
    >
      {children}
    </a>
  );
}
