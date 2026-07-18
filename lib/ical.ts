/** Must match PROPERTY_TIME_ZONE in lib/calendar.ts (Asia/Bangkok). */
const ICAL_PROPERTY_TIME_ZONE = "Asia/Bangkok";

export type IcalEvent = {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
};

function unfoldIcsLines(text: string) {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];

  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
      continue;
    }

    lines.push(line);
  }

  return lines;
}

/** Calendar-day arithmetic in UTC so server timezone cannot shift results. */
function addIsoDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function utcInstantToPropertyDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  const instant = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return instant.toLocaleDateString("en-CA", { timeZone });
}

/**
 * Parse an iCal DTSTART/DTEND value into a property civil date (YYYY-MM-DD).
 * DATE values are used as-is. UTC timestamps are converted to the property
 * timezone so Thailand stays are not shifted by the UTC calendar day.
 */
function parseIcsDateValue(value: string, params = "", timeZone = ICAL_PROPERTY_TIME_ZONE) {
  const compact = value.trim();
  const paramsUpper = params.toUpperCase();
  const isDateOnly = paramsUpper.includes("VALUE=DATE") || /^\d{8}$/.test(compact);

  if (isDateOnly) {
    const digits = compact.replace(/[^0-9]/g, "").slice(0, 8);
    return {
      date: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
      isDateOnly: true,
    };
  }

  const utcMatch = compact.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i);
  if (utcMatch) {
    return {
      date: utcInstantToPropertyDate(
        Number(utcMatch[1]),
        Number(utcMatch[2]),
        Number(utcMatch[3]),
        Number(utcMatch[4]),
        Number(utcMatch[5]),
        Number(utcMatch[6]),
        timeZone,
      ),
      isDateOnly: false,
    };
  }

  // Floating / TZID wall-clock: OTA feeds encode the listing civil date in YMD.
  const match = compact.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    throw new Error(`Invalid iCal date: ${value}`);
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    isDateOnly: false,
  };
}

function parseIcsDurationDays(value: string) {
  const match = value.trim().match(/^P(?:(\d+)W)?(?:(\d+)D)?(?:T.*)?$/i);
  if (!match) {
    return null;
  }

  const weeks = Number(match[1] ?? 0);
  const days = Number(match[2] ?? 0);
  const total = weeks * 7 + days;
  return total > 0 ? total : null;
}

function splitIcsLine(line: string) {
  const separator = line.indexOf(":");
  if (separator === -1) {
    return { name: line.toUpperCase(), params: "", value: "" };
  }

  const keyPart = line.slice(0, separator);
  const value = line.slice(separator + 1);
  const [name, ...paramParts] = keyPart.split(";");
  return {
    name: name.toUpperCase(),
    params: paramParts.join(";"),
    value,
  };
}

export function parseIcsEvents(icsText: string): IcalEvent[] {
  const lines = unfoldIcsLines(icsText);
  const events: IcalEvent[] = [];
  let inEvent = false;
  let uid = "";
  let summary = "Reserved";
  let status = "";
  let dtstart = "";
  let dtstartParams = "";
  let dtend = "";
  let dtendParams = "";
  let duration = "";

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === "BEGIN:VEVENT") {
      inEvent = true;
      uid = "";
      summary = "Reserved";
      status = "";
      dtstart = "";
      dtstartParams = "";
      dtend = "";
      dtendParams = "";
      duration = "";
      continue;
    }

    if (upper === "END:VEVENT") {
      if (inEvent && uid && dtstart && status !== "CANCELLED") {
        const start = parseIcsDateValue(dtstart, dtstartParams);
        let arrival = start.date;
        let departure = arrival;

        if (dtend) {
          const end = parseIcsDateValue(dtend, dtendParams);
          departure = end.date;
        } else {
          const durationDays = duration ? parseIcsDurationDays(duration) : null;
          if (durationDays) {
            let cursor = arrival;
            for (let index = 0; index < durationDays; index += 1) {
              cursor = addIsoDay(cursor);
            }
            departure = cursor;
          } else {
            departure = addIsoDay(arrival);
          }
        }

        // Exclusive end must be after arrival (DATE DTEND is exclusive; timed
        // same-civil-day ranges still occupy that night).
        if (departure <= arrival) {
          departure = addIsoDay(arrival);
        }

        if (departure > arrival) {
          events.push({
            uid,
            summary,
            startDate: arrival,
            endDate: departure,
          });
        }
      }

      inEvent = false;
      continue;
    }

    if (!inEvent) {
      continue;
    }

    const { name, params, value } = splitIcsLine(line);

    switch (name) {
      case "UID":
        uid = value.trim();
        break;
      case "SUMMARY":
        summary = value.trim() || "Reserved";
        break;
      case "STATUS":
        status = value.trim().toUpperCase();
        break;
      case "DTSTART":
        dtstart = value.trim();
        dtstartParams = params;
        break;
      case "DTEND":
        dtend = value.trim();
        dtendParams = params;
        break;
      case "DURATION":
        duration = value.trim();
        break;
      default:
        break;
    }
  }

  return events;
}

function escapeIcalText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatIcsUtcDateTime(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function toIcsDate(iso: string) {
  return iso.replace(/-/g, "");
}

export function buildIcsCalendar(events: IcalEvent[], calendarName: string) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kamala//Room Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(calendarName)}`,
  ];
  const stamp = formatIcsUtcDateTime(new Date());

  for (const event of events) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.startDate)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcsDate(event.endDate)}`);
    lines.push(`SUMMARY:${escapeIcalText(event.summary)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
