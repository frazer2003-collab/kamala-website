import { RoomSummaryIcon } from "@/components/room-summary-icons";
import { buildRoomSummaryLines } from "@/lib/room-summary-lines";

type RoomSummaryListProps = {
  summary: string;
  id?: string;
  variant?: "listing" | "detail";
};

export function RoomSummaryList({
  summary,
  id,
  variant = "detail",
}: RoomSummaryListProps) {
  const lines = buildRoomSummaryLines(summary);

  if (lines.length === 0) {
    return null;
  }

  return (
    <ul
      className={`room-summary-list room-summary-list--${variant}`}
      id={id}
    >
      {lines.map((line) => (
        <li className="room-summary-list__row" key={line.text}>
          <RoomSummaryIcon className="room-summary-list__icon" name={line.icon} />
          <span className="room-summary-list__text">{line.text}</span>
        </li>
      ))}
    </ul>
  );
}
