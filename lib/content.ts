export type Tour = {
  id: string;
  title: string;
  summary: string;
  durationLabel: string | null;
  priceLabel: string | null;
  imageUrl: string | null;
  galleryUrls: string[];
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
};

export type Room = {
  id: string;
  name: string;
  shortName: string;
  rate: number;
  sleeps: string;
  outlook: string;
  availableCount: number;
  summary: string;
  amenities: string[];
  tone: "courtyard" | "garden" | "veranda" | "attic";
  imageUrl: string | null;
  galleryUrls: string[];
  icalExportToken?: string | null;
};

export type StayStatus = "expected" | "checked-in" | "checked-out";

export type BookingStatus =
  | "new"
  | "pending_payment"
  | "awaiting"
  | "confirmed"
  | "needs-reply"
  | "declined";

export type Booking = {
  id: string;
  guest: string;
  room: string;
  dates: string;
  nights: number;
  status: BookingStatus;
  requestedAt: string;
  note: string;
  contact: string;
  phone: string;
  arrivalDate: string;
  departureDate: string;
  roomId: string;
  estimatedTotal: number;
  depositAmount: number;
  depositPaid: boolean;
  stayStatus: StayStatus;
  staffNote: string;
};

export const rooms: Room[] = [
  {
    id: "courtyard",
    name: "Superior Double or Twin Room",
    shortName: "Superior",
    rate: 142,
    sleeps: "Sleeps 2",
    outlook: "Comfortable room with double or twin bed configuration",
    availableCount: 2,
    summary:
      "A calm room for short stays, with flexible bedding, morning light, and a quiet position in the guesthouse.",
    amenities: ["Private bath", "Double or twin beds", "Breakfast included"],
    tone: "courtyard",
    imageUrl: null,
    galleryUrls: [],
  },
  {
    id: "garden",
    name: "Deluxe Double Room with Balcony",
    shortName: "Deluxe",
    rate: 168,
    sleeps: "Sleeps 2",
    outlook: "Deluxe double room opening onto a private balcony",
    availableCount: 1,
    summary:
      "A little more room for longer visits, with balcony seating and a bright outlook over the guesthouse grounds.",
    amenities: ["Private bath", "Double bed", "Breakfast included", "Private balcony"],
    tone: "garden",
    imageUrl: null,
    galleryUrls: [],
  },
  {
    id: "veranda",
    name: "Triple Room with Balcony",
    shortName: "Triple",
    rate: 136,
    sleeps: "Sleeps 3",
    outlook: "Triple room with balcony seating for small groups",
    availableCount: 2,
    summary:
      "A practical room for friends or family, with space for three guests and a balcony for evening air.",
    amenities: ["Private bath", "Three beds", "Breakfast included", "Private balcony"],
    tone: "veranda",
    imageUrl: null,
    galleryUrls: [],
  },
  {
    id: "loft",
    name: "Family Room with Balcony",
    shortName: "Family",
    rate: 210,
    sleeps: "Sleeps 4",
    outlook: "Spacious family room with balcony and separated sleeping areas",
    availableCount: 0,
    summary:
      "A spacious room for a family stay, with balcony access and enough space for parents and children.",
    amenities: ["Bath + shower", "Family bedding", "Breakfast included", "Private balcony"],
    tone: "attic",
    imageUrl: null,
    galleryUrls: [],
  },
];

export const bookings: Booking[] = [
  {
    id: "BK-1048",
    guest: "Mara Jensen",
    room: "Deluxe Double Room with Balcony",
    dates: "Jun 21-24",
    nights: 3,
    status: "new",
    requestedAt: "12 minutes ago",
    note: "Arriving by train around 6 pm. Asked whether breakfast can be dairy-free.",
    contact: "mara@example.com",
    phone: "+1 555 010 1048",
    arrivalDate: "2026-06-21",
    departureDate: "2026-06-24",
    roomId: "garden",
    estimatedTotal: 504,
    depositAmount: 252,
    depositPaid: true,
    stayStatus: "expected",
    staffNote: "",
  },
  {
    id: "BK-1047",
    guest: "Theo Park",
    room: "Superior Double or Twin Room",
    dates: "Jun 25-27",
    nights: 2,
    status: "awaiting",
    requestedAt: "1 hour ago",
    note: "Needs parking confirmation before paying deposit.",
    contact: "theo@example.com",
    phone: "+1 555 010 1047",
    arrivalDate: "2026-06-25",
    departureDate: "2026-06-27",
    roomId: "courtyard",
    estimatedTotal: 284,
    depositAmount: 142,
    depositPaid: true,
    stayStatus: "expected",
    staffNote: "",
  },
  {
    id: "BK-1046",
    guest: "Amina Cole",
    room: "Triple Room with Balcony",
    dates: "Jun 27-30",
    nights: 3,
    status: "confirmed",
    requestedAt: "Yesterday",
    note: "Deposit received. Guest asked for a late check-in note.",
    contact: "amina@example.com",
    phone: "+1 555 010 1046",
    arrivalDate: "2026-06-27",
    departureDate: "2026-06-30",
    roomId: "veranda",
    estimatedTotal: 408,
    depositAmount: 204,
    depositPaid: true,
    stayStatus: "expected",
    staffNote: "Leave late check-in note at the front desk.",
  },
  {
    id: "BK-1045",
    guest: "Long Nguyen",
    room: "Family Room with Balcony",
    dates: "Jul 3-7",
    nights: 4,
    status: "needs-reply",
    requestedAt: "Yesterday",
    note: "Room is requested by another guest for the same first night.",
    contact: "long@example.com",
    phone: "+1 555 010 1045",
    arrivalDate: "2026-07-03",
    departureDate: "2026-07-07",
    roomId: "loft",
    estimatedTotal: 840,
    depositAmount: 420,
    depositPaid: false,
    stayStatus: "expected",
    staffNote: "",
  },
];

export const sampleTours: Tour[] = [
  {
    id: "island-hopping",
    title: "Island hopping",
    summary:
      "Visit nearby islands with lunch on the beach, snorkeling stops, and time to swim in clear water.",
    durationLabel: "Full day",
    priceLabel: "From ฿1,800",
    imageUrl: null,
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Enquire",
    sortOrder: 0,
  },
  {
    id: "old-town-walk",
    title: "Old town walking tour",
    summary:
      "A relaxed guided walk through local markets, temples, and quiet lanes with stories from the neighborhood.",
    durationLabel: "3 hours",
    priceLabel: "From ฿650",
    imageUrl: null,
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Enquire",
    sortOrder: 1,
  },
  {
    id: "sunset-cruise",
    title: "Sunset cruise",
    summary:
      "Evening boat trip with drinks and light snacks as the coast turns gold — a calm way to end the day.",
    durationLabel: "2 hours",
    priceLabel: "From ฿1,200",
    imageUrl: null,
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Enquire",
    sortOrder: 2,
  },
];

export const houseRules = [
  "Check-in is from 3 pm to 8 pm. Later arrivals are arranged by reply.",
  "Breakfast is included for every confirmed booking request.",
  "Quiet hours begin at 10 pm so early guests and families can rest.",
];
