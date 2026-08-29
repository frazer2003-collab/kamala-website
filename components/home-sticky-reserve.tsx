"use client";

import { useEffect, useState } from "react";
import {
  SELECT_ROOM_EVENT,
  SELECT_ROOM_STORAGE_KEY,
  type SelectRoomDetail,
} from "@/components/book-room-link";
import type { Room } from "@/lib/content";

type HomeStickyReserveProps = {
  initialRoomId?: string;
  rooms: Room[];
};

function readStoredSelection(): SelectRoomDetail | null {
  try {
    const raw = sessionStorage.getItem(SELECT_ROOM_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const detail = JSON.parse(raw) as SelectRoomDetail;
    return detail.roomId ? detail : null;
  } catch {
    return null;
  }
}

export function HomeStickyReserve({ initialRoomId, rooms }: HomeStickyReserveProps) {
  const [roomId, setRoomId] = useState(initialRoomId);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initialRoomId) {
      return;
    }

    const stored = readStoredSelection();
    if (stored?.roomId) {
      setRoomId(stored.roomId);
    }

    function handleSelect(event: Event) {
      const detail = (event as CustomEvent<SelectRoomDetail>).detail;
      if (detail?.roomId) {
        setRoomId(detail.roomId);
      }
    }

    window.addEventListener(SELECT_ROOM_EVENT, handleSelect);
    return () => window.removeEventListener(SELECT_ROOM_EVENT, handleSelect);
  }, [initialRoomId]);

  useEffect(() => {
    const booking = document.getElementById("booking");
    if (!roomId || !booking || typeof IntersectionObserver === "undefined") {
      setVisible(Boolean(roomId));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setVisible(!entry.isIntersecting);
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(booking);
    return () => observer.disconnect();
  }, [roomId]);

  const room = rooms.find((entry) => entry.id === roomId);

  if (!room || !visible) {
    return null;
  }

  return (
    <>
      <div className="home-sticky-reserve" role="region" aria-label="Continue booking">
        <p className="home-sticky-reserve__label">
          <span className="home-sticky-reserve__room">{room.name}</span>
          <span className="home-sticky-reserve__sep" aria-hidden="true">
            ·
          </span>
          <span>Ready to book</span>
        </p>
        <a className="button button--primary home-sticky-reserve__cta" href="#booking">
          Book now
        </a>
      </div>
      <div aria-hidden="true" className="home-sticky-reserve__spacer" />
    </>
  );
}
