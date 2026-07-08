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

function addIsoDay(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseIcsDateValue(value: string, params = "") {
  const compact = value.trim();
  const isDateOnly = params.toUpperCase().includes("VALUE=DATE") || /^\d{8}$/.test(compact);

  if (isDateOnly) {
    const digits = compact.replace(/[^0-9]/g, "").slice(0, 8);
    return {
      date: `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`,
      isDateOnly: true,
    };
  }

  const match = compact.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    throw new Error(`Invalid iCal date: ${value}`);
  }

  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    isDateOnly: false,
  };
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
  let dtstart = "";
  let dtstartParams = "";
  let dtend = "";
  let dtendParams = "";

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === "BEGIN:VEVENT") {
      inEvent = true;
      uid = "";
      summary = "Reserved";
      dtstart = "";
      dtend = "";
      continue;
    }

    if (upper === "END:VEVENT") {
      if (inEvent && uid && dtstart) {
        const start = parseIcsDateValue(dtstart, dtstartParams);
        let arrival = start.date;
        let departure = arrival;

        if (dtend) {
          const end = parseIcsDateValue(dtend, dtendParams);
          departure = end.date;
          if (start.isDateOnly && end.isDateOnly && departure <= arrival) {
            departure = addIsoDay(arrival);
          }
        } else {
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
      case "DTSTART":
        dtstart = value.trim();
        dtstartParams = params;
        break;
      case "DTEND":
        dtend = value.trim();
        dtendParams = params;
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
