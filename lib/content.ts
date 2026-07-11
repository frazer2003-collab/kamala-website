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
  /** Physical door number assignment; null until staff assigns. */
  roomUnitId: string | null;
  roomNumber: string | null;
};

export const rooms: Room[] = [
  {
    id: "courtyard",
    name: "Superior Double or Twin Room",
    shortName: "Superior",
    rate: 700,
    sleeps: "Sleeps 2",
    outlook: "33 sqm - king or twin - city view - non-smoking",
    availableCount: 5,
    summary:
      "A comfortable room a minute from Tha Phae Gate, with blackout curtains, work desk, safe, and a private bathroom with shower and bidet. Flexible king or twin setup for couples or friends.",
    amenities: [
      "Air conditioning",
      "Free Wi-Fi",
      "Private bathroom",
      "King or twin beds",
      "Cable TV",
      "Safe",
      "Desk",
      "Breakfast included",
    ],
    tone: "courtyard",
    imageUrl: "/rooms/superior.jpg",
    galleryUrls: ["/rooms/superior-2.jpg"],
  },
  {
    id: "garden",
    name: "Deluxe Double Room with Balcony",
    shortName: "Deluxe",
    rate: 950,
    sleeps: "Sleeps 2",
    outlook: "45 sqm - king bed - balcony - garden view",
    availableCount: 4,
    summary:
      "More space for longer stays: 45 sqm with a private balcony over the guesthouse garden, seating for two, refrigerator, and en-suite bathroom. Quiet room facing greenery above the old city.",
    amenities: [
      "Air conditioning",
      "Free Wi-Fi",
      "Private bathroom",
      "King bed",
      "Private balcony",
      "Refrigerator",
      "Cable TV",
      "Safe",
      "Breakfast included",
    ],
    tone: "garden",
    imageUrl: "/rooms/deluxe.jpg",
    galleryUrls: ["/rooms/deluxe-2.jpg"],
  },
  {
    id: "veranda",
    name: "Triple Room with Balcony",
    shortName: "Triple",
    rate: 900,
    sleeps: "Sleeps 3",
    outlook: "45 sqm - queen + single - balcony - garden view",
    availableCount: 4,
    summary:
      "Ideal for three guests travelling together: queen and single bed configuration, private balcony with seating, and room to spread out after a day around Chiang Mai's old city.",
    amenities: [
      "Air conditioning",
      "Free Wi-Fi",
      "Private bathroom",
      "Queen and single beds",
      "Private balcony",
      "Refrigerator",
      "Cable TV",
      "Safe",
      "Breakfast included",
    ],
    tone: "veranda",
    imageUrl: "/rooms/triple.jpg",
    galleryUrls: ["/rooms/triple-2.jpg"],
  },
  {
    id: "loft",
    name: "Family Room with Balcony",
    shortName: "Family",
    rate: 1100,
    sleeps: "Sleeps 4",
    outlook: "70 sqm - four single beds - balcony - fits families",
    availableCount: 1,
    summary:
      "The largest room in the house: 70 sqm with four single beds, private balcony, and space for a family stay steps from Tha Phae Gate and the Sunday walking street.",
    amenities: [
      "Air conditioning",
      "Free Wi-Fi",
      "Private bathroom",
      "Four single beds",
      "Private balcony",
      "Refrigerator",
      "Cable TV",
      "Safe",
      "Breakfast included",
    ],
    tone: "attic",
    imageUrl: "/rooms/family.jpg",
    galleryUrls: ["/rooms/family-2.jpg"],
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
    roomUnitId: null,
    roomNumber: null,
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
    roomUnitId: null,
    roomNumber: null,
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
    roomUnitId: null,
    roomNumber: null,
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
    roomUnitId: null,
    roomNumber: null,
  },
];

export const sampleTours: Tour[] = [
  {
    id: "doi-suthep",
    title: "Doi Suthep temple & city views",
    summary:
      "Climb the naga staircase to Wat Phra That Doi Suthep, Chiang Mai’s landmark mountain temple, then take in the city from the viewpoint. A calm half-day that fits easily around check-in.",
    durationLabel: "Half day",
    priceLabel: "From THB 800",
    imageUrl: "/tours/doi-suthep.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 0,
  },
  {
    id: "old-city-temples",
    title: "Old City temples walk",
    summary:
      "A guided walk through the moated Old City — Wat Chedi Luang, Wat Phra Singh, and quiet lanes — with time for coffee and local stories near Tha Phae Gate.",
    durationLabel: "3 hours",
    priceLabel: "From THB 650",
    imageUrl: "/tours/old-city.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 1,
  },
  {
    id: "thai-cooking-class",
    title: "Thai cooking class",
    summary:
      "Market stop for herbs and spices, then cook classic northern and central dishes at a local kitchen. Vegetarian options are easy to arrange — tell us when you book.",
    durationLabel: "Half day",
    priceLabel: "From THB 1,200",
    imageUrl: "/tours/cooking.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 2,
  },
  {
    id: "ethical-elephant",
    title: "Ethical elephant sanctuary",
    summary:
      "A no-riding visit focused on observation and care: prepare food, learn from mahouts, and spend time with the herd in a forest setting outside the city.",
    durationLabel: "Full day",
    priceLabel: "From THB 1,800",
    imageUrl: "/tours/elephant.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 3,
  },
  {
    id: "doi-inthanon",
    title: "Doi Inthanon national park",
    summary:
      "Thailand’s highest peak, twin royal pagodas, a short forest trail, and cooler mountain air. Lunch and park entry are usually included on group tours.",
    durationLabel: "Full day",
    priceLabel: "From THB 1,800",
    imageUrl: "/tours/doi-inthanon.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 4,
  },
  {
    id: "sticky-waterfalls",
    title: "Sticky Waterfalls day trip",
    summary:
      "Climb the limestone cascades at Bua Thong (Sticky Waterfalls), swim in clear pools, and stop at nearby hot springs on the way back to Chiang Mai.",
    durationLabel: "Full day",
    priceLabel: "From THB 1,500",
    imageUrl: "/tours/sticky-waterfalls.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 5,
  },
  {
    id: "night-market-food",
    title: "Night market food walk",
    summary:
      "Taste northern Thai street food around the Night Bazaar or Sunday Walking Street — khao soi, sai ua, and sweets — with a local host who knows what to order.",
    durationLabel: "2–3 hours",
    priceLabel: "From THB 900",
    imageUrl: "/tours/night-market.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 6,
  },
  {
    id: "chiang-rai-day",
    title: "Chiang Rai temples day trip",
    summary:
      "White Temple (Wat Rong Khun), Blue Temple, and a stop at the Black House museum — a full day north of Chiang Mai with hotel pickup common on group tours.",
    durationLabel: "Full day",
    priceLabel: "From THB 1,600",
    imageUrl: "/tours/chiang-rai.jpg",
    galleryUrls: [],
    linkUrl: null,
    linkLabel: "Arrange at the front desk",
    sortOrder: 7,
  },
];

export const houseRules = [
  "Check-in is from 3 pm to 8 pm. Email us if you need a later arrival.",
  "Breakfast is included with every confirmed stay.",
  "Quiet hours start at 10 pm so guests and families can rest.",
];
