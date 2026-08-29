export type HomeBookingPathStep = "dates" | "room" | "reserve";

export function resolveHomeBookingPathStep(
  hasDates: boolean,
  hasRoom: boolean,
): HomeBookingPathStep {
  if (!hasDates) {
    return "dates";
  }

  if (!hasRoom) {
    return "room";
  }

  return "reserve";
}

export const HOME_BOOKING_PATH_STEPS = [
  { id: "dates" as const, label: "Dates", href: "#dates" },
  { id: "room" as const, label: "Room", href: "#rooms" },
  { id: "reserve" as const, label: "Reserve", href: "#booking" },
] as const;
