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
  /** Empty-cell day dialog (soft-opened; no RSC round-trip). */
  dayRoomId: string;
  dayDate: string;
  dayUnitId: string;
  dayMode: string;
  selectBooking: (key: string) => void;
  selectBlock: (key: string) => void;
  selectDay: (options: {
    roomId: string;
    date: string;
    unitId?: string;
    mode?: string;
  }) => void;
  close: () => void;
};

const CalendarStaySelectionContext = createContext<CalendarStaySelection | null>(
  null,
);

function readSelectionFromLocation() {
  if (typeof window === "undefined") {
    return {
      bookingKey: "",
      blockKey: "",
      dayRoomId: "",
      dayDate: "",
      dayUnitId: "",
      dayMode: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const bookingKey = params.get("booking") ?? "";
  const blockKey = params.get("block") ?? "";
  if (bookingKey || blockKey) {
    return {
      bookingKey,
      blockKey,
      dayRoomId: "",
      dayDate: "",
      dayUnitId: "",
      dayMode: "",
    };
  }

  return {
    bookingKey: "",
    blockKey: "",
    dayRoomId: params.get("room") ?? "",
    dayDate: params.get("date") ?? "",
    dayUnitId: params.get("unit") ?? "",
    dayMode: params.get("mode") ?? "",
  };
}

function writeCalendarUrl({
  monthKey,
  fromIso,
  toIso,
  bookingKey,
  blockKey,
  dayRoomId,
  dayDate,
  dayUnitId,
  dayMode,
  historyMode,
}: {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  bookingKey?: string;
  blockKey?: string;
  dayRoomId?: string;
  dayDate?: string;
  dayUnitId?: string;
  dayMode?: string;
  historyMode: "push" | "replace";
}) {
  const params = new URLSearchParams(window.location.search);
  params.set("month", monthKey);
  if (fromIso) {
    params.set("from", fromIso);
  } else {
    params.delete("from");
  }
  if (toIso) {
    params.set("to", toIso);
  } else {
    params.delete("to");
  }
  params.delete("through");

  if (bookingKey) {
    params.set("booking", bookingKey);
    params.delete("block");
    params.delete("room");
    params.delete("date");
    params.delete("unit");
    params.delete("mode");
  } else if (blockKey) {
    params.set("block", blockKey);
    params.delete("booking");
    params.delete("room");
    params.delete("date");
    params.delete("unit");
    params.delete("mode");
  } else if (dayRoomId && dayDate) {
    params.delete("booking");
    params.delete("block");
    params.set("room", dayRoomId);
    params.set("date", dayDate);
    if (dayUnitId) {
      params.set("unit", dayUnitId);
    } else {
      params.delete("unit");
    }
    if (dayMode) {
      params.set("mode", dayMode);
    } else {
      params.delete("mode");
    }
  } else {
    params.delete("booking");
    params.delete("block");
    params.delete("room");
    params.delete("date");
    params.delete("unit");
    params.delete("mode");
  }

  const next = `/staff/calendar?${params.toString()}`;
  if (historyMode === "replace") {
    window.history.replaceState({ calendarStay: true }, "", next);
  } else {
    window.history.pushState({ calendarStay: true }, "", next);
  }
}

type CalendarStaySelectionProviderProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  initialBookingKey?: string;
  initialBlockKey?: string;
  initialDayRoomId?: string;
  initialDayDate?: string;
  initialDayUnitId?: string;
  initialDayMode?: string;
  children: ReactNode;
};

export function CalendarStaySelectionProvider({
  monthKey,
  fromIso,
  toIso,
  initialBookingKey = "",
  initialBlockKey = "",
  initialDayRoomId = "",
  initialDayDate = "",
  initialDayUnitId = "",
  initialDayMode = "",
  children,
}: CalendarStaySelectionProviderProps) {
  const [bookingKey, setBookingKey] = useState(initialBookingKey);
  const [blockKey, setBlockKey] = useState(initialBlockKey);
  const [dayRoomId, setDayRoomId] = useState(initialDayRoomId);
  const [dayDate, setDayDate] = useState(initialDayDate);
  const [dayUnitId, setDayUnitId] = useState(initialDayUnitId);
  const [dayMode, setDayMode] = useState(initialDayMode);

  // Keep client selection aligned with server/searchParams after redirects.
  useEffect(() => {
    setBookingKey(initialBookingKey);
    setBlockKey(initialBlockKey);
    setDayRoomId(initialDayRoomId);
    setDayDate(initialDayDate);
    setDayUnitId(initialDayUnitId);
    setDayMode(initialDayMode);
  }, [
    initialBookingKey,
    initialBlockKey,
    initialDayRoomId,
    initialDayDate,
    initialDayUnitId,
    initialDayMode,
  ]);

  useEffect(() => {
    function onPopState() {
      const keys = readSelectionFromLocation();
      setBookingKey(keys.bookingKey);
      setBlockKey(keys.blockKey);
      setDayRoomId(keys.dayRoomId);
      setDayDate(keys.dayDate);
      setDayUnitId(keys.dayUnitId);
      setDayMode(keys.dayMode);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const selectBooking = useCallback(
    (key: string) => {
      setBookingKey(key);
      setBlockKey("");
      setDayRoomId("");
      setDayDate("");
      setDayUnitId("");
      setDayMode("");
      writeCalendarUrl({
        monthKey,
        fromIso,
        toIso,
        bookingKey: key,
        historyMode: "push",
      });
    },
    [fromIso, monthKey, toIso],
  );

  const selectBlock = useCallback(
    (key: string) => {
      setBlockKey(key);
      setBookingKey("");
      setDayRoomId("");
      setDayDate("");
      setDayUnitId("");
      setDayMode("");
      writeCalendarUrl({
        monthKey,
        fromIso,
        toIso,
        blockKey: key,
        historyMode: "push",
      });
    },
    [fromIso, monthKey, toIso],
  );

  const selectDay = useCallback(
    (options: {
      roomId: string;
      date: string;
      unitId?: string;
      mode?: string;
    }) => {
      setBookingKey("");
      setBlockKey("");
      setDayRoomId(options.roomId);
      setDayDate(options.date);
      setDayUnitId(options.unitId ?? "");
      setDayMode(options.mode ?? "");
      writeCalendarUrl({
        monthKey,
        fromIso,
        toIso,
        dayRoomId: options.roomId,
        dayDate: options.date,
        dayUnitId: options.unitId,
        dayMode: options.mode,
        historyMode: "push",
      });
    },
    [fromIso, monthKey, toIso],
  );

  const close = useCallback(() => {
    setBookingKey("");
    setBlockKey("");
    setDayRoomId("");
    setDayDate("");
    setDayUnitId("");
    setDayMode("");
    writeCalendarUrl({ monthKey, fromIso, toIso, historyMode: "push" });
  }, [fromIso, monthKey, toIso]);

  const value = useMemo(
    () => ({
      bookingKey,
      blockKey,
      dayRoomId,
      dayDate,
      dayUnitId,
      dayMode,
      selectBooking,
      selectBlock,
      selectDay,
      close,
    }),
    [
      bookingKey,
      blockKey,
      dayRoomId,
      dayDate,
      dayUnitId,
      dayMode,
      selectBooking,
      selectBlock,
      selectDay,
      close,
    ],
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
