import type { ReactNode } from "react";
import type { RoomSummaryIconKey } from "@/lib/room-summary-lines";

type IconProps = {
  className?: string;
};

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 16 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.35,
};

function LocationIcon() {
  return (
    <Svg>
      <path d="M8 1.8a4.2 4.2 0 0 0-4.2 4.2c0 3.1 4.2 8.2 4.2 8.2s4.2-5.1 4.2-8.2A4.2 4.2 0 0 0 8 1.8Z" {...stroke} />
      <circle cx="8" cy="6" r="1.35" {...stroke} />
    </Svg>
  );
}

function BathroomIcon() {
  return (
    <Svg>
      <path d="M3.2 8.2h9.6v2.1a2.4 2.4 0 0 1-2.4 2.4H5.6a2.4 2.4 0 0 1-2.4-2.4V8.2Z" {...stroke} />
      <path d="M4.4 8.2V4.8a2 2 0 0 1 2-2h.8" {...stroke} />
      <path d="M5.2 13.2v1M10.8 13.2v1" {...stroke} />
    </Svg>
  );
}

function GardenIcon() {
  return (
    <Svg>
      <path d="M3 12.4h10" {...stroke} />
      <path d="M8 12.4V6.2" {...stroke} />
      <path d="M8 8.2c-1.7 0-3.2-1.4-3.2-3.2 1.8 0 3.2 1.4 3.2 3.2Z" {...stroke} />
      <path d="M8 7.4c1.5 0 2.8-1.2 2.8-2.8-1.6 0-2.8 1.3-2.8 2.8Z" {...stroke} />
    </Svg>
  );
}

function GroundIcon() {
  return (
    <Svg>
      <path d="M3.2 13.2V6.6L8 3.2l4.8 3.4v6.6" {...stroke} />
      <path d="M6.4 13.2v-3.2h3.2v3.2" {...stroke} />
    </Svg>
  );
}

function BedIcon() {
  return (
    <Svg>
      <path d="M2.4 12.4V8.4a1.6 1.6 0 0 1 1.6-1.6h8a1.6 1.6 0 0 1 1.6 1.6v4" {...stroke} />
      <path d="M2.4 10.2h11.2" {...stroke} />
      <path d="M4.4 6.8V5.2a1.4 1.4 0 0 1 1.4-1.4h2.2A1.4 1.4 0 0 1 9.4 5.2v1.6" {...stroke} />
    </Svg>
  );
}

function FamilyIcon() {
  return (
    <Svg>
      <circle cx="5.2" cy="5" r="1.4" {...stroke} />
      <circle cx="10.6" cy="5.4" r="1.15" {...stroke} />
      <path d="M2.6 12.4v-1.4A2.6 2.6 0 0 1 5.2 8.4h.4A2.6 2.6 0 0 1 8.2 11v1.4" {...stroke} />
      <path d="M8.6 12.4v-1.1a2.2 2.2 0 0 1 2.2-2.2h.2a2.2 2.2 0 0 1 2.2 2.2v1.1" {...stroke} />
    </Svg>
  );
}

function QuietIcon() {
  return (
    <Svg>
      <path d="M10.8 3.2A4.8 4.8 0 1 0 12.6 11 3.8 3.8 0 0 1 10.8 3.2Z" {...stroke} />
    </Svg>
  );
}

function FridgeIcon() {
  return (
    <Svg>
      <rect height="11.2" rx="1.2" width="7.2" x="4.4" y="2.4" {...stroke} />
      <path d="M4.4 7.4h7.2" {...stroke} />
      <path d="M6.2 4.4v1.2M6.2 9v1.6" {...stroke} />
    </Svg>
  );
}

function DeskIcon() {
  return (
    <Svg>
      <path d="M2.4 7.2h11.2" {...stroke} />
      <path d="M4 7.2v6M12 7.2v6" {...stroke} />
      <path d="M5.2 4.4h5.6v2.8H5.2V4.4Z" {...stroke} />
    </Svg>
  );
}

function SizeIcon() {
  return (
    <Svg>
      <path d="M3.2 6.2V3.2h3" {...stroke} />
      <path d="M12.8 9.8v3h-3" {...stroke} />
      <path d="M3.2 3.2 12.8 12.8" {...stroke} />
    </Svg>
  );
}

function RoomIcon() {
  return (
    <Svg>
      <path d="M2.8 8.2 8 3.4l5.2 4.8" {...stroke} />
      <path d="M4.2 7.4v5.4h7.6V7.4" {...stroke} />
    </Svg>
  );
}

const ICONS: Record<RoomSummaryIconKey, () => ReactNode> = {
  bathroom: BathroomIcon,
  garden: GardenIcon,
  ground: GroundIcon,
  bed: BedIcon,
  family: FamilyIcon,
  location: LocationIcon,
  quiet: QuietIcon,
  fridge: FridgeIcon,
  desk: DeskIcon,
  size: SizeIcon,
  room: RoomIcon,
};

export function RoomSummaryIcon({
  name,
  className,
}: IconProps & { name: RoomSummaryIconKey }) {
  const Icon = ICONS[name];
  return (
    <span className={className}>
      <Icon />
    </span>
  );
}
