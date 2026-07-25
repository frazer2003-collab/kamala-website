type CalendarRangeFieldsProps = {
  monthKey: string;
  fromIso?: string;
  toIso?: string;
};

/** Hidden fields so server actions can preserve the staff calendar date range. */
export function CalendarRangeFields({
  monthKey,
  fromIso,
  toIso,
}: CalendarRangeFieldsProps) {
  return (
    <>
      <input name="month" type="hidden" value={monthKey} />
      {fromIso ? <input name="from" type="hidden" value={fromIso} /> : null}
      {toIso ? <input name="to" type="hidden" value={toIso} /> : null}
    </>
  );
}
