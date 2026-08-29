"use client";

import { useEffect, useState } from "react";
import {
  SELECT_ROOM_EVENT,
  SELECT_ROOM_STORAGE_KEY,
  type SelectRoomDetail,
} from "@/components/book-room-link";
import {
  HOME_BOOKING_PATH_STEPS,
  resolveHomeBookingPathStep,
} from "@/lib/home-booking-path";

type HomeBookingPathProps = {
  hasDates: boolean;
  initialRoomId?: string;
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

export function HomeBookingPath({ hasDates, initialRoomId }: HomeBookingPathProps) {
  const [hasRoom, setHasRoom] = useState(Boolean(initialRoomId));

  useEffect(() => {
    if (initialRoomId) {
      return;
    }

    const stored = readStoredSelection();
    if (stored?.roomId) {
      setHasRoom(true);
    }

    function handleSelect(event: Event) {
      const detail = (event as CustomEvent<SelectRoomDetail>).detail;
      if (detail?.roomId) {
        setHasRoom(true);
      }
    }

    window.addEventListener(SELECT_ROOM_EVENT, handleSelect);
    return () => window.removeEventListener(SELECT_ROOM_EVENT, handleSelect);
  }, [initialRoomId]);

  const currentStep = resolveHomeBookingPathStep(hasDates, hasRoom);
  const currentIndex = HOME_BOOKING_PATH_STEPS.findIndex(
    (step) => step.id === currentStep,
  );

  return (
    <nav
      aria-label="How to reserve"
      className="home-booking-path"
    >
      <ol className="home-booking-path__list">
        {HOME_BOOKING_PATH_STEPS.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStep;

          return (
            <li
              className={[
                "home-booking-path__step",
                isComplete ? "home-booking-path__step--complete" : "",
                isCurrent ? "home-booking-path__step--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={step.id}
            >
              <a
                aria-current={isCurrent ? "step" : undefined}
                className="home-booking-path__link"
                href={step.href}
              >
                <span aria-hidden="true" className="home-booking-path__marker">
                  {isComplete ? "✓" : index + 1}
                </span>
                <span className="home-booking-path__label">{step.label}</span>
              </a>
            </li>
          );
        })}
      </ol>
      <p className="home-booking-path__note">
        {currentStep === "dates"
          ? "Reserve directly on this website — no booking site in between."
          : currentStep === "room"
            ? "Choose a room type, then complete your reservation below."
            : "Finish guest details and pay in full to hold your room."}
      </p>
    </nav>
  );
}
