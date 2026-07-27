/** Staff-facing copy when a stay cannot fit the room type. */
export function staffCapacityErrorMessage(code?: string | null) {
  switch (code) {
    case "capacity-verify-failed":
      return "Could not verify room availability. Try again in a moment.";
    case "no-assignable-door":
      return "Every door for this room type is already booked for these dates — including door numbers shown on the calendar.";
    case "unavailable":
    case "overbook":
      return "These dates are full for this room type.";
    default:
      return null;
  }
}
