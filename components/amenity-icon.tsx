import type { ReactElement, ReactNode } from "react";

type AmenityIconProps = {
  className?: string;
};

function IconBase({
  children,
  className,
}: AmenityIconProps & { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="24"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  );
}

function AirConditioningIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3v18M5 8.5l14 7M19 8.5 5 15.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function WifiIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M2.5 9.5a14.5 14.5 0 0 1 19 0M6.5 13.5a9 9 0 0 1 11 0M10.5 17.5a3.5 3.5 0 0 1 3 0M12 20.5h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function TvIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <rect
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        width="18"
        x="3"
        y="5"
      />
      <path d="M8 20h8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

function KitchenIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 4v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4M5 13v7M19 13v7M9 20h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function BedIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4M4 12v4h16v-4M4 16v2M20 16v2M8 12v4M16 12v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function BathIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M6 10V7a2 2 0 0 1 2-2h1M18 10V7a2 2 0 0 0-2-2h-1M6 10h12v3a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4v-3Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function ParkingIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 17h14l-1.2-4.5H6.2L5 17ZM7 17v2M17 17v2M6.5 9.5 8 5h8l1.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function CoffeeIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M6 8h11a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8ZM6 8V6M17 11h1.5a2.5 2.5 0 0 0 0-5H17M8 18h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function WorkspaceIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <rect
        height="8"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
        width="14"
        x="5"
        y="10"
      />
      <path d="M9 10V7h6v3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

function DiningIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M6 4v8M8 4v5M6 12v8M16 4v16M18 8H14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function LaundryIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <rect
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        width="14"
        x="5"
        y="5"
      />
      <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

function LuggageIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <rect
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        width="14"
        x="5"
        y="8"
      />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

function OutdoorIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function BikeIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="7" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 16h5M12 10l2 3M12 10l-2 3M14 13h3l-1 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function SafetyIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M12 4 19 7v5c0 4.2-3 7.4-7 8-4-.6-7-3.8-7-8V7l7-3Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path d="M9.5 12.5 11 14l3.5-4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

function LockIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <rect
        height="9"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
        width="12"
        x="6"
        y="11"
      />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.5" />
    </IconBase>
  );
}

function EntranceIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 20V4h10v16M15 12h4v8H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function FanIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 10V4M12 20v-6M10 12H4M20 12h-6M8.5 8.5 5 5M19 19l-3.5-3.5M15.5 8.5 19 5M5 19l3.5-3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function BreakfastIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <path
        d="M5 14h14M7 14V9a5 5 0 0 1 10 0v5M9 18h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </IconBase>
  );
}

function DefaultAmenityIcon(props: AmenityIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 12.5 11 14l3.5-4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </IconBase>
  );
}

type AmenityIconComponent = (props: AmenityIconProps) => ReactElement;

const AMENITY_ICON_RULES: Array<{
  test: RegExp;
  Icon: AmenityIconComponent;
}> = [
  { test: /wifi|internet/i, Icon: WifiIcon },
  { test: /air conditioning|ac\b/i, Icon: AirConditioningIcon },
  { test: /tv|television|cable/i, Icon: TvIcon },
  { test: /kitchen|microwave|toaster|fridge|freezer|kettle/i, Icon: KitchenIcon },
  { test: /bed|linen|pillow|blanket|mattress/i, Icon: BedIcon },
  { test: /bath|shower|bidet|soap|shampoo|conditioner|gel|hot water/i, Icon: BathIcon },
  { test: /parking|garage/i, Icon: ParkingIcon },
  { test: /coffee/i, Icon: CoffeeIcon },
  { test: /workspace|desk/i, Icon: WorkspaceIcon },
  { test: /dining|table/i, Icon: DiningIcon },
  { test: /dryer|laundromat|laundry|drying rack|iron/i, Icon: LaundryIcon },
  { test: /luggage/i, Icon: LuggageIcon },
  { test: /outdoor|balcony|garden|patio|furniture/i, Icon: OutdoorIcon },
  { test: /bike/i, Icon: BikeIcon },
  { test: /fire extinguisher|first aid|smoke alarm|safe/i, Icon: SafetyIcon },
  { test: /entrance|lock|key/i, Icon: EntranceIcon },
  { test: /fan|mosquito/i, Icon: FanIcon },
  { test: /breakfast/i, Icon: BreakfastIcon },
  { test: /hanger|wardrobe|closet|storage|essentials/i, Icon: LuggageIcon },
  { test: /clean/i, Icon: SafetyIcon },
];

export function AmenityIcon({
  amenity,
  className,
}: {
  amenity: string;
  className?: string;
}) {
  const rule = AMENITY_ICON_RULES.find(({ test }) => test.test(amenity));
  const Icon = rule?.Icon ?? DefaultAmenityIcon;

  return <Icon className={className} />;
}
