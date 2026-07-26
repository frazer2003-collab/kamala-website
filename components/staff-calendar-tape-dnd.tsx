"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { assignStayRoomUnit } from "@/app/actions";
import { useOptionalStaffBusy } from "@/components/staff-busy";
import {
  canDropStayOnUnit,
  parseTapeMovePayload,
  serializeTapeMovePayload,
  STAFF_TAPE_MOVE_MIME,
  type StaffTapeMovePayload,
} from "@/lib/staff-calendar-tape-move";
import type { RoomUnit, UnitOccupancy } from "@/lib/room-units";

type StaffCalendarTapeDndContextValue = {
  canManage: boolean;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  dragging: StaffTapeMovePayload | null;
  beginDrag: (payload: StaffTapeMovePayload, event: DragEvent) => void;
  endDrag: () => void;
  dropOnUnit: (unit: RoomUnit, event: DragEvent) => void;
  unitDropState: (
    unit: RoomUnit,
  ) => "idle" | "active" | "blocked";
  submitMove: (payload: StaffTapeMovePayload, roomUnitId: string) => void;
};

const StaffCalendarTapeDndContext = createContext<StaffCalendarTapeDndContextValue | null>(
  null,
);

export function useStaffCalendarTapeDnd() {
  return useContext(StaffCalendarTapeDndContext);
}

type StaffCalendarTapeDndProviderProps = {
  canManage: boolean;
  monthKey: string;
  fromIso?: string;
  toIso?: string;
  roomUnits: RoomUnit[];
  occupancies: UnitOccupancy[];
  children: ReactNode;
};

export function StaffCalendarTapeDndProvider({
  canManage,
  monthKey,
  fromIso,
  toIso,
  roomUnits,
  occupancies,
  children,
}: StaffCalendarTapeDndProviderProps) {
  const [dragging, setDragging] = useState<StaffTapeMovePayload | null>(null);
  const busy = useOptionalStaffBusy();

  const submitMove = useCallback(
    (payload: StaffTapeMovePayload, roomUnitId: string) => {
      const formData = new FormData();
      formData.set("kind", payload.kind);
      formData.set("stay-id", payload.stayId);
      formData.set("room-unit-id", roomUnitId);
      formData.set("month", monthKey);
      formData.set("guest-label", payload.guestLabel);
      if (fromIso) {
        formData.set("from", fromIso);
      }
      if (toIso) {
        formData.set("to", toIso);
      }
      const message = payload.currentUnitId
        ? "Moving stay to new door…"
        : "Assigning room number…";
      startTransition(() => {
        const work = Promise.resolve(assignStayRoomUnit(formData));
        if (busy) {
          void busy.withBusy(work, message);
          return;
        }
        void work;
      });
    },
    [busy, fromIso, monthKey, toIso],
  );

  const beginDrag = useCallback(
    (payload: StaffTapeMovePayload, event: DragEvent) => {
      if (!canManage) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData(STAFF_TAPE_MOVE_MIME, serializeTapeMovePayload(payload));
      event.dataTransfer.setData("text/plain", serializeTapeMovePayload(payload));
      event.dataTransfer.effectAllowed = "move";
      setDragging(payload);
    },
    [canManage],
  );

  const endDrag = useCallback(() => {
    setDragging(null);
  }, []);

  const dropOnUnit = useCallback(
    (unit: RoomUnit, event: DragEvent) => {
      event.preventDefault();
      const payload =
        parseTapeMovePayload(event.dataTransfer.getData(STAFF_TAPE_MOVE_MIME)) ??
        parseTapeMovePayload(event.dataTransfer.getData("text/plain")) ??
        dragging;
      setDragging(null);
      if (!payload || !canManage) {
        return;
      }
      const result = canDropStayOnUnit({
        payload,
        unit,
        units: roomUnits,
        occupancies,
      });
      if (!result.ok) {
        return;
      }
      submitMove(payload, unit.id);
    },
    [canManage, dragging, occupancies, roomUnits, submitMove],
  );

  const unitDropState = useCallback(
    (unit: RoomUnit) => {
      if (!dragging) {
        return "idle" as const;
      }
      const result = canDropStayOnUnit({
        payload: dragging,
        unit,
        units: roomUnits,
        occupancies,
      });
      return result.ok ? ("active" as const) : ("blocked" as const);
    },
    [dragging, occupancies, roomUnits],
  );

  const value = useMemo(
    () => ({
      canManage,
      monthKey,
      fromIso,
      toIso,
      roomUnits,
      occupancies,
      dragging,
      beginDrag,
      endDrag,
      dropOnUnit,
      unitDropState,
      submitMove,
    }),
    [
      beginDrag,
      canManage,
      dragging,
      dropOnUnit,
      endDrag,
      fromIso,
      monthKey,
      occupancies,
      roomUnits,
      submitMove,
      toIso,
      unitDropState,
    ],
  );

  return (
    <StaffCalendarTapeDndContext.Provider value={value}>
      {children}
    </StaffCalendarTapeDndContext.Provider>
  );
}
