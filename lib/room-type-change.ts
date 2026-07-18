export type RoomTypeOption = {
  id: string;
  name: string;
};

export type RoomTypeChangeResult =
  | {
      ok: true;
      roomId: string;
      roomName: string;
      roomIdChanged: boolean;
      roomUnitId: string | null;
    }
  | { ok: false; error: "unknown-room" };

export function resolveRoomTypeChange(input: {
  currentRoomId: string;
  requestedRoomId: string;
  rooms: RoomTypeOption[];
  formRoomUnitId: string | null;
}): RoomTypeChangeResult {
  const requestedRoomId = input.requestedRoomId.trim() || input.currentRoomId;
  const room = input.rooms.find((entry) => entry.id === requestedRoomId);
  if (!room) {
    if (requestedRoomId === input.currentRoomId) {
      return {
        ok: true,
        roomId: input.currentRoomId,
        roomName: input.currentRoomId,
        roomIdChanged: false,
        roomUnitId: input.formRoomUnitId,
      };
    }
    return { ok: false, error: "unknown-room" };
  }

  const roomIdChanged = room.id !== input.currentRoomId;
  return {
    ok: true,
    roomId: room.id,
    roomName: room.name,
    roomIdChanged,
    roomUnitId: roomIdChanged ? null : input.formRoomUnitId,
  };
}
