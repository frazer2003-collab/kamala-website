import {
  getPropertyTodayIso,
  parseStaffTimelineRange,
} from "@/lib/calendar";
import {
  isoMonthRangeContaining,
  isoWeekRangeContaining,
} from "@/lib/desk-expenses";

export type DeskListRangeParams = {
  month?: string;
  from?: string;
  to?: string;
  view?: string;
};

export type DeskListRange = {
  fromIso: string;
  toIso: string;
  monthKey: string;
  todayIso: string;
};

/** Shared Today / This week / This month / custom strip parsing for desk lists. */
export function parseDeskListRange(
  params: DeskListRangeParams,
  todayIso = getPropertyTodayIso(),
): DeskListRange {
  let fromIso: string;
  let toIso: string;
  let monthKey: string;

  if (params.view === "week") {
    ({ fromIso, toIso } = isoWeekRangeContaining(todayIso));
    monthKey = fromIso.slice(0, 7);
  } else if (params.view === "month") {
    ({ fromIso, toIso } = isoMonthRangeContaining(
      params.month ? `${params.month}-01` : todayIso,
    ));
    monthKey = fromIso.slice(0, 7);
  } else if (
    params.view === "day" ||
    (!params.from && !params.to && !params.month)
  ) {
    fromIso =
      params.from && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
        ? params.from
        : todayIso;
    toIso = fromIso;
    monthKey = fromIso.slice(0, 7);
  } else {
    const range = parseStaffTimelineRange({
      month: params.month,
      from: params.from,
      to: params.to,
    });
    fromIso = range.fromIso;
    toIso = range.toIso;
    monthKey = range.monthKey;
  }

  return { fromIso, toIso, monthKey, todayIso };
}

export function deskListRangeHref(
  pathname: string,
  fromIso: string,
  toIso: string,
  extra?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({
    month: fromIso.slice(0, 7),
    from: fromIso,
    to: toIso,
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  return `${pathname}?${params.toString()}`;
}

export function deskListReturnTo(
  pathname: string,
  fromIso: string,
  toIso: string,
  monthKey: string,
) {
  return deskListRangeHref(pathname, fromIso, toIso, { month: monthKey });
}
