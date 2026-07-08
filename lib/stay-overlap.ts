export type UnavailableStayDay = {
  iso: string;
  reason: "closed" | "sold-out";
};

export function parseOverlapDays(overlapParam: string | undefined) {
  if (!overlapParam?.trim()) {
    return [] as UnavailableStayDay[];
  }

  return overlapParam
    .split(",")
    .filter(Boolean)
    .map((part) => {
      const [iso, reason] = part.split(":");
      return {
        iso,
        reason: reason === "closed" ? "closed" : "sold-out",
      } satisfies UnavailableStayDay;
    })
    .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day.iso));
}

export function formatOverlapErrorMessage(days: UnavailableStayDay[]) {
  if (days.length === 0) {
    return "These dates are not available for this room type.";
  }

  const dateFormatter = new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const closedDays = days.filter((day) => day.reason === "closed");
  const soldOutDays = days.filter((day) => day.reason === "sold-out");
  const parts = ["This stay overlaps unavailable dates."];

  if (closedDays.length > 0) {
    const labels = closedDays.map((day) =>
      dateFormatter.format(new Date(`${day.iso}T00:00:00`)),
    );
    parts.push(`Closed: ${labels.join(", ")}.`);
  }

  if (soldOutDays.length > 0) {
    const labels = soldOutDays.map((day) =>
      dateFormatter.format(new Date(`${day.iso}T00:00:00`)),
    );
    parts.push(`No rooms left: ${labels.join(", ")}.`);
  }

  parts.push("Choose different dates or resolve the conflict with guests first.");

  return parts.join(" ");
}

export function appendOverlapErrorToHref(
  href: string,
  days: UnavailableStayDay[],
) {
  const separator = href.includes("?") ? "&" : "?";
  const overlap = days.map((day) => `${day.iso}:${day.reason}`).join(",");

  return `${href}${separator}error=overlap&overlap=${encodeURIComponent(overlap)}`;
}
