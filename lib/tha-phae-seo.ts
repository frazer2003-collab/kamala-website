/** Shared location SEO phrases — one source for title, H1, schema, and section headings. */

export const THA_PHAE_GATE_GEO = {
  latitude: 18.787,
  longitude: 98.993,
} as const;

/** The guesthouse's own pin, from its Google Business Profile. */
export const GUESTHOUSE_GEO = {
  latitude: 18.7876028,
  longitude: 98.994205,
} as const;

export const GUESTHOUSE_MAPS_URL = "https://maps.app.goo.gl/RMichTyjdzdbdv2r5";

export const GUESTHOUSE_THAI_NAME = "กมลา บูทีค เกสท์เฮาส์";

export const GUESTHOUSE_THAI_ADDRESS =
  "ถนนท่าแพ ซอย 6 ตำบลช้างคลาน อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50100";

/** Searched phrasing; keep it in every description and schema block that can fit it. */
export const GUESTHOUSE_STYLE = "Thai traditional style";

export type NearbyPlace = {
  name: string;
  distance: string;
  travel: string;
};

/** Approximate distances from the guesthouse pin; road routes run a little longer. */
export const THA_PHAE_NEARBY_PLACES: readonly NearbyPlace[] = [
  { name: "Tha Phae Gate", distance: "100 m", travel: "2 minutes on foot" },
  {
    name: "Sunday Walking Street (starts at Tha Phae Gate)",
    distance: "100 m",
    travel: "2 minutes on foot",
  },
  { name: "Warorot Market", distance: "700 m", travel: "10 minutes on foot" },
  { name: "Wat Chedi Luang", distance: "1 km", travel: "12 minutes on foot" },
  { name: "Night Bazaar", distance: "1 km", travel: "12 minutes on foot" },
  { name: "Nawarat Bridge and the Ping River", distance: "1 km", travel: "12 minutes on foot" },
  { name: "Wat Phra Singh", distance: "1.5 km", travel: "20 minutes on foot or 5 by tuk-tuk" },
  { name: "Chiang Mai Railway Station", distance: "2.5 km", travel: "10 minutes by car" },
  { name: "Arcade Bus Terminal", distance: "3 km", travel: "15 minutes by car" },
  { name: "Nimman Road", distance: "3.5 km", travel: "15 minutes by car" },
  { name: "Chiang Mai International Airport", distance: "5 km", travel: "15 to 20 minutes by car" },
];

export type FaqItem = { question: string; answer: string };

type FaqSettings = {
  propertyName: string;
  checkInFrom: string;
  checkInUntil: string;
};

export function buildThaPhaeLocationFaq({
  propertyName,
  checkInFrom,
  checkInUntil,
}: FaqSettings): FaqItem[] {
  return [
    {
      question: "Is there a guesthouse near Tha Phae Gate in Chiang Mai?",
      answer: `Yes. ${propertyName} is on Tha Phae Road Soi 6, about 100 metres from Tha Phae Gate. It is a two-minute walk to the gate and the start of the Sunday Walking Street.`,
    },
    {
      question: "Is it in Chiang Mai Old City?",
      answer: `${propertyName} sits at the Old City's east gate, just outside the moat. Old City temples such as Wat Chedi Luang are a 12-minute walk, and the Night Bazaar is the same distance in the other direction.`,
    },
    {
      question: "How close is the Sunday Walking Street?",
      answer:
        "The Sunday Walking Street market starts at Tha Phae Gate and runs west along Ratchadamnoen Road, so it begins two minutes from the door.",
    },
    {
      question: "Can I walk to the Night Bazaar?",
      answer:
        "Yes. The Night Bazaar on Chang Klan Road is about 1 km east, roughly 12 minutes on foot along Tha Phae Road. Warorot Market is on the way.",
    },
    {
      question: "How do I get from Chiang Mai Airport to the guesthouse?",
      answer:
        "The airport is about 5 km away. A taxi or Grab takes 15 to 20 minutes. Show the driver the Thai address on this page or the Google Maps pin.",
    },
    {
      question: "How do you spell Tha Phae Gate?",
      answer:
        "You will see Tha Phae, Tha Pae, Thae Phae and Thapae Gate in maps and guides. They all mean the same east gate of Chiang Mai Old City (ประตูท่าแพ).",
    },
    {
      question: "What are the check-in times?",
      answer: `Check-in is from ${checkInFrom} to ${checkInUntil}. Message us if you will arrive outside those hours.`,
    },
    {
      question: "What style is the guesthouse?",
      answer: `${propertyName} is a Thai traditional style guesthouse: wooden rooms set around a courtyard garden, run by a local family.`,
    },
    {
      question: "Is breakfast included?",
      answer: "Yes. Breakfast is included with every room booked on this website.",
    },
    {
      question: "Can I book directly instead of through a booking site?",
      answer:
        "Yes. Choose your dates on the home page, pick a room and pay online. We confirm every stay ourselves.",
    },
  ];
}

export const THA_PHAE_THAI_FAQ: readonly FaqItem[] = [
  {
    question: "ที่พักอยู่ใกล้ประตูท่าแพไหม",
    answer: "ใกล้มาก ห่างจากประตูท่าแพประมาณ 100 เมตร เดินประมาณ 2 นาที",
  },
  {
    question: "ใกล้ถนนคนเดินท่าแพไหม",
    answer: "ถนนคนเดินวันอาทิตย์เริ่มที่ประตูท่าแพ เดินจากที่พักเพียง 2 นาที",
  },
  {
    question: "ที่พักเป็นสไตล์ไหน",
    answer: "เป็นเกสท์เฮาส์สไตล์ไทยดั้งเดิม ห้องพักไม้ล้อมรอบสวนกลางบ้าน ดูแลโดยครอบครัวท้องถิ่น",
  },
  {
    question: "มีอาหารเช้าไหม",
    answer: "มีอาหารเช้ารวมในทุกห้องที่จองผ่านเว็บไซต์นี้",
  },
  {
    question: "จองห้องพักอย่างไร",
    answer: "เลือกวันที่และห้องพักที่หน้าแรก แล้วชำระเงินออนไลน์ได้ทันที ทางเราจะยืนยันการจองให้ทุกครั้ง",
  },
];

/** Canonical gate name for guest-facing copy. */
export const THAE_PHAE_GATE_NAME = "Thae Phae Gate";

/**
 * Homepage lodging queries with real search interest (Google autocomplete).
 * Primary cluster: guesthouse / guest house Chiang Mai (winnable for an
 * independent house). Hotels queries stay secondary — OTAs own the head term.
 *
 * Do not invent stuffed variants. Spaced “Chiang Mai” is the searched form.
 * “Guesthouse” and “guest house” are near-synonyms; cover both once, naturally.
 */
export const THA_PHAE_PRIMARY_TITLE =
  "Chiang Mai Guesthouse near Thae Phae Gate";

/** Guest-facing H1 — host voice, still names Chiang Mai Old City. */
export const THA_PHAE_PRIMARY_HEADLINE =
  "A garden guesthouse in Chiang Mai Old City";

/** Absolute title (no brand suffix) so it stays near 50 characters. */
export const THA_PHAE_LOCATION_TITLE = "Guesthouse near Tha Phae Gate, Chiang Mai Old City";

export const THA_PHAE_LOCATION_H1 = "Guesthouse near Tha Phae Gate, Chiang Mai";

export const THA_PHAE_ROOMS_HEADING = `Rooms near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_BOOKING_HEADING = `Book your stay near ${THAE_PHAE_GATE_NAME}`;

export const THA_PHAE_ABOUT_HEADING = "How we run the house";

export const THA_PHAE_SEO_KEYWORDS = [
  "Chiang Mai guesthouse",
  "guesthouse Chiang Mai",
  "Chiang Mai guest house",
  "guest house Chiang Mai",
  "guesthouses in Chiang Mai",
  "guesthouse in Chiang Mai Old City",
  "hotels in Chiang Mai old city",
  "boutique hotel Chiang Mai old city",
  "Thai traditional style guesthouse Chiang Mai",
  "Thai style guesthouse Chiang Mai",
] as const;

export function isThaPhaeSeoContext(
  locationLabel: string,
  addressLine: string | null,
): boolean {
  return (
    locationLabel.toLowerCase().includes("chiang mai") &&
    /thae?\s*ph?ae/i.test(addressLine ?? "")
  );
}

export function buildGoogleMapsSearchUrl(addressLine: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`;
}

/** Convert settings copy like "3:00 pm" to schema.org time "15:00". */
export function toSchemaTime(hourMinute: string): string | undefined {
  const match = hourMinute.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!match) {
    return undefined;
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === "pm" && hours < 12) {
    hours += 12;
  } else if (meridiem === "am" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

export function normalizeTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? `tel:${digits}` : `tel:${digits}`;
}

export function buildThaPhaeMetaDescription(propertyName: string): string {
  return `${propertyName}: a ${GUESTHOUSE_STYLE} Chiang Mai guesthouse by ${THAE_PHAE_GATE_NAME}, Old City. Garden rooms, breakfast included. Book direct.`;
}

export function buildThaPhaeLocationDescription(propertyName: string): string {
  return `${propertyName} is a ${GUESTHOUSE_STYLE} Chiang Mai guesthouse 100 m from Tha Phae Gate, by the Old City. Map, distances and directions.`;
}

export function buildThaPhaeHeroLede(): string {
  return `A family-run Chiang Mai guesthouse in the Old City. Reserve directly on this website. We are in front of ${THAE_PHAE_GATE_NAME} — just across from the Sunday Walking Street.`;
}

export function buildThaPhaeStayStoryLede(propertyName: string): string {
  return `${propertyName} is a family-run, ${GUESTHOUSE_STYLE} Chiang Mai guest house: wooden rooms around a courtyard garden in the Old City. We sit just across the street from the Sunday Walking Street, with ${THAE_PHAE_GATE_NAME} about 100 metres away (a two-minute walk). Everyday essentials — 7-Eleven, ATMs, Boots, McDonald’s, and Starbucks — are steps from the door. Nawarat Bridge and its night market are about six minutes away.`;
}
