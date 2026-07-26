import {
  BOOKING_SOURCES,
  BOOKING_SOURCE_LABELS,
  type BookingSource,
} from "@/lib/booking-source";

type BookingSourceFieldProps = {
  id: string;
  name?: string;
  value: BookingSource | "";
  disabled?: boolean;
  onChange?: (value: BookingSource) => void;
  required?: boolean;
};

export function BookingSourceField({
  id,
  name = "booking-source",
  value,
  disabled = false,
  onChange,
  required = true,
}: BookingSourceFieldProps) {
  return (
    <div className="field-pair">
      <label htmlFor={id}>Source</label>
      <select
        disabled={disabled}
        id={id}
        name={name}
        onChange={
          onChange
            ? (event) => onChange(event.target.value as BookingSource)
            : undefined
        }
        required={required}
        value={value || "walk-in"}
      >
        {BOOKING_SOURCES.map((source) => (
          <option key={source} value={source}>
            {BOOKING_SOURCE_LABELS[source]}
          </option>
        ))}
      </select>
    </div>
  );
}
