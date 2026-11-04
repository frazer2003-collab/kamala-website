"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import { applyCalendarDoorDrop } from "@/app/actions";
import {
  isCalendarDoorDropReplaceable,
  type DoorDropStay,
} from "@/lib/calendar-door-drop";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";

type DragSource = DoorDropStay & { label: string };

type CalendarDoorDndContextValue = {
  canManage: boolean;
  dragging: DragSource | null;
  dropHoverKey: string | null;
  pending: boolean;
  /** Sync — true as soon as drag starts, before React re-renders. */
  isDragging: () => boolean;
  beginDrag: (stay: DragSource, event: DragEvent) => void;
  endDrag: () => void;
  setDropHoverKey: (key: string | null) => void;
  canReplaceBooking: (target: DoorDropStay) => boolean;
  dropOnUnit: (unitId: string) => void;
  dropOnBooking: (stay: DoorDropStay) => void;
  dropOnUnassign: () => void;
};

const CalendarDoorDndContext = createContext<CalendarDoorDndContextValue | null>(
  null,
);

export function useCalendarDoorDnd() {
  return useContext(CalendarDoorDndContext);
}

export function CalendarDoorDndProvider({
  canManage,
  monthKey,
  fromIso,
  toIso,
  units,
  occupancies,
  children,
}: {
  canManage: boolean;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  units: RoomUnit[];
  occupancies: UnitOccupancy[];
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [dropHoverKey, setDropHoverKey] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const draggingRef = useRef<DragSource | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const unitsRef = useRef(units);
  const occupanciesRef = useRef(occupancies);
  unitsRef.current = units;
  occupanciesRef.current = occupancies;

  const isDragging = useCallback(() => draggingRef.current !== null, []);

  const submitDrop = useCallback(
    (fields: Record<string, string>) => {
      const source = draggingRef.current;
      if (!canManage || !source || pending) {
        return;
      }
      const data = new FormData();
      data.set("source-booking-id", source.id);
      data.set("month", monthKey);
      if (fromIso) {
        data.set("from", fromIso);
      }
      if (toIso) {
        data.set("to", toIso);
      }
      for (const [key, value] of Object.entries(fields)) {
        data.set(key, value);
      }
      startTransition(() => {
        void applyCalendarDoorDrop(data);
      });
    },
    [canManage, pending, monthKey, fromIso, toIso],
  );

  const beginDrag = useCallback(
    (stay: DragSource, event: DragEvent) => {
      if (!canManage) {
        event.preventDefault();
        return;
      }
      draggingRef.current = stay;
      // Sync attribute so day cells stop capturing before React re-renders.
      rootRef.current?.setAttribute("data-door-dragging", "1");
      setDragging(stay);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", stay.id);
    },
    [canManage],
  );

  const endDrag = useCallback(() => {
    draggingRef.current = null;
    rootRef.current?.removeAttribute("data-door-dragging");
    setDragging(null);
    setDropHoverKey(null);
  }, []);

  const canReplaceBooking = useCallback((target: DoorDropStay) => {
    if (!draggingRef.current) {
      return false;
    }
    return isCalendarDoorDropReplaceable({
      source: draggingRef.current,
      target,
      units: unitsRef.current,
      occupancies: occupanciesRef.current,
    });
  }, []);

  const dropOnUnit = useCallback(
    (unitId: string) => {
      submitDrop({ "target-type": "unit", "target-unit-id": unitId });
      endDrag();
    },
    [submitDrop, endDrag],
  );

  const dropOnBooking = useCallback(
    (stay: DoorDropStay) => {
      submitDrop({
        "target-type": "booking",
        "target-booking-id": stay.id,
      });
      endDrag();
    },
    [submitDrop, endDrag],
  );

  const dropOnUnassign = useCallback(() => {
    submitDrop({ "target-type": "unassign" });
    endDrag();
  }, [submitDrop, endDrag]);

  return (
    <CalendarDoorDndContext.Provider
      value={{
        canManage,
        dragging,
        dropHoverKey,
        pending,
        isDragging,
        beginDrag,
        endDrag,
        setDropHoverKey,
        canReplaceBooking,
        dropOnUnit,
        dropOnBooking,
        dropOnUnassign,
      }}
    >
      <div className="calendar-door-dnd" ref={rootRef}>
        {children}
      </div>
    </CalendarDoorDndContext.Provider>
  );
}
