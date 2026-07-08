/**
 * Lower rank = shown earlier. Patterns are checked in order; first match wins.
 * Unmatched amenities sort last, alphabetically among themselves.
 */
const AMENITY_PRIORITY: Array<{ test: RegExp; rank: number }> = [
  { test: /wifi|internet/i, rank: 10 },
  { test: /air conditioning|\bac\b/i, rank: 20 },
  { test: /private entrance/i, rank: 30 },
  { test: /private bath|bath \+|bathroom/i, rank: 40 },
  { test: /hot water(?! kettle)/i, rank: 50 },
  { test: /^essentials$/i, rank: 60 },
  { test: /bed linen|bedding|double or twin|double bed|three beds|family bedding/i, rank: 70 },
  { test: /extra pillows|blankets/i, rank: 80 },
  { test: /breakfast/i, rank: 90 },
  { test: /free parking on premises|residential garage/i, rank: 100 },
  { test: /free street parking/i, rank: 110 },
  { test: /kitchenette|kitchen/i, rank: 120 },
  { test: /mini fridge|fridge|refrigerator/i, rank: 130 },
  { test: /microwave/i, rank: 140 },
  { test: /freezer/i, rank: 150 },
  { test: /\btv\b|television|cable/i, rank: 160 },
  { test: /workspace|desk/i, rank: 170 },
  { test: /balcony|outdoor dining|outdoor furniture|patio|garden/i, rank: 180 },
  { test: /hair dryer/i, rank: 190 },
  { test: /hangers|wardrobe|clothing storage|closet/i, rank: 200 },
  { test: /iron/i, rank: 210 },
  { test: /coffee maker|^coffee$/i, rank: 220 },
  { test: /hot water kettle|kettle/i, rank: 230 },
  { test: /toaster/i, rank: 240 },
  { test: /shampoo|conditioner|body soap|shower gel|bidet/i, rank: 250 },
  { test: /room-darkening|blackout/i, rank: 260 },
  { test: /mosquito/i, rank: 270 },
  { test: /portable fans|^fans?$/i, rank: 280 },
  { test: /smoke alarm|smoke detector/i, rank: 290 },
  { test: /fire extinguisher/i, rank: 300 },
  { test: /first aid/i, rank: 310 },
  { test: /^safe$/i, rank: 320 },
  { test: /luggage drop/i, rank: 330 },
  { test: /long term stays/i, rank: 340 },
  { test: /laundromat|laundry/i, rank: 350 },
  { test: /drying rack/i, rank: 360 },
  { test: /^dryer$/i, rank: 370 },
  { test: /dining table/i, rank: 380 },
  { test: /cleaning available/i, rank: 390 },
  { test: /\bbikes?\b/i, rank: 400 },
  { test: /paid parking/i, rank: 410 },
];

const UNMATCHED_RANK = 900;

function getAmenityRank(amenity: string) {
  const match = AMENITY_PRIORITY.find(({ test }) => test.test(amenity));
  return match?.rank ?? UNMATCHED_RANK;
}

/** Most important amenities first; unknown items last, A–Z. */
export function sortAmenitiesByImportance(amenities: string[]) {
  return [...amenities].sort((left, right) => {
    const rankDiff = getAmenityRank(left) - getAmenityRank(right);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    return left.localeCompare(right, undefined, { sensitivity: "base" });
  });
}
