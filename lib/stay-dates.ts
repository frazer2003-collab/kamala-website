export type StayDates = {
  arrival: string;
  departure: string;
  nights: number;
};

export function parseStayDates(arrival?: string, departure?: string): StayDates | null {
  if (!arrival || !departure || !/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departure)) {
    return null;
  }

  const arrivalDate = new Date(`${arrival}T00:00:00`);
  const departureDate = new Date(`${departure}T00:00:00`);

  if (Number.isNaN(arrivalDate.getTime()) || Number.isNaN(departureDate.getTime())) {
    return null;
  }

  if (departureDate <= arrivalDate) {
    return null;
  }

  const nights = Math.round(
    (departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (nights < 1 || nights > 21) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (arrivalDate < today) {
    return null;
  }

  return { arrival, departure, nights };
}

export function formatStayDateRange(arrival: string, departure: string) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(new Date(`${arrival}T00:00:00`))} – ${formatter.format(new Date(`${departure}T00:00:00`))}`;
}
