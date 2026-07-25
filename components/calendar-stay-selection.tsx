"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CalendarStaySelection = {
  bookingKey: string;
  blockKey: string;
  selectBooking: (key: string) => void;
  selectBlock: (key: string) => void;
  close: () => void;
};

const CalendarStaySelectionContext = createContext<CalendarStaySelection | null>(
  null,
);

function readStayKeysFromLocation() {
  if (typeof window === "undefined") {
    return { bookingKey: "", blockKey: "" };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    bookingKey: params.get("booking") ?? "",
    blockKey: params.get("block") ?? "",
  };
}

function writeStayUrl({
  monthKey,
  throughKey,
  bookingKey,
  blockKey,
  mode,
}: {
  monthKey: string;
  throughKey?: string;
  bookingKey?: string;
  blockKey?: string;
  mode: "push" | "replace";
}) {
  const params = new URLSearchParams(window.location.search);
  params.set("month", monthKey);
  params.set("through", throughKey || monthKey);
  params.delete("room");
  params.delete("date");
  params.delete("mode");

  if (bookingKey) {
    params.set("booking", bookingKey);
    params.delete("block");
  } else if (blockKey) {
    params.set("block", blockKey);
    params.delete("booking");
  } else {
    params.delete("booking");
    params.delete("block");
  }

  const next = `/staff/calendar?${params.toString()}`;
  if (mode === "replace") {
    window.history.replaceState({ calendarStay: true }, "", next);
  } else {
    window.history.pushState({ calendarStay: true }, "", next);
  }
}

type CalendarStaySelectionProviderProps = {
  monthKey: string;
  throughKey?: string;
  initialBookingKey?: string;
  initialBlockKey?: string;
  children: ReactNode;
};

export function CalendarStaySelectionProvider({
  monthKey,
  throughKey,
  initialBookingKey = "",
  initialBlockKey = "",
  children,
}: CalendarStaySelectionProviderProps) {
  const [bookingKey, setBookingKey] = useState(initialBookingKey);
  const [blockKey, setBlockKey] = useState(initialBlockKey);

  useEffect(() => {
    function onPopState() {
      const keys = readStayKeysFromLocation();
      setBookingKey(keys.bookingKey);
      setBlockKey(keys.blockKey);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectBooking = useCallback(
    (key: string) => {
      setBookingKey(key);
      setBlockKey("");
      writeStayUrl({ monthKey, throughKey, bookingKey: key, mode: "push" });
    },
    [monthKey, throughKey],
  );

  const selectBlock = useCallback(
    (key: string) => {
      setBlockKey(key);
      setBookingKey("");
      writeStayUrl({ monthKey, throughKey, blockKey: key, mode: "push" });
    },
    [monthKey, throughKey],
  );

  const close = useCallback(() => {
    setBookingKey("");
    setBlockKey("");
    writeStayUrl({ monthKey, throughKey, mode: "push" });
  }, [monthKey, throughKey]);

  const value = useMemo(
    () => ({
      bookingKey,
      blockKey,
      selectBooking,
      selectBlock,
      close,
    }),
    [bookingKey, blockKey, selectBooking, selectBlock, close],
  );

  return (
    <CalendarStaySelectionContext.Provider value={value}>
      {children}
    </CalendarStaySelectionContext.Provider>
  );
}

export function useCalendarStaySelection() {
  return useContext(CalendarStaySelectionContext);
}
