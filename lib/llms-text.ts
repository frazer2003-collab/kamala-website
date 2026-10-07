import type { PropertySettings } from "@/lib/property-settings";
import {
  buildThaPhaeLocationFaq,
  GUESTHOUSE_GEO,
  GUESTHOUSE_MAPS_URL,
  GUESTHOUSE_THAI_ADDRESS,
  GUESTHOUSE_THAI_NAME,
  THA_PHAE_NEARBY_PLACES,
  THA_PHAE_THAI_FAQ,
} from "@/lib/tha-phae-seo";

export function buildLlmsLocationSection(settings: PropertySettings, base: string) {
  const nearby = THA_PHAE_NEARBY_PLACES.map(
    (place) => `- ${place.name}: ${place.distance}, ${place.travel}`,
  ).join("\n");

  return `## Location

${settings.propertyName} is on Tha Phae Road Soi 6, Changklan, Chiang Mai, about 100 metres (a two-minute walk) from Tha Phae Gate, the east gate of Chiang Mai Old City. The Sunday Walking Street starts at the gate. Full details: ${base}/location

- Thai name: ${GUESTHOUSE_THAI_NAME}
- Thai address: ${GUESTHOUSE_THAI_ADDRESS}
- Coordinates: ${GUESTHOUSE_GEO.latitude}, ${GUESTHOUSE_GEO.longitude}
- Google Maps: ${GUESTHOUSE_MAPS_URL}
- Spellings of the gate: Tha Phae, Tha Pae, Thae Phae, Thapae (ประตูท่าแพ)

### Distances from the guesthouse

${nearby}`;
}

export function buildLlmsFaqSection(settings: PropertySettings) {
  const english = buildThaPhaeLocationFaq(settings)
    .map((item) => `### ${item.question}\n\n${item.answer}`)
    .join("\n\n");
  const thai = THA_PHAE_THAI_FAQ.map((item) => `### ${item.question}\n\n${item.answer}`).join(
    "\n\n",
  );

  return `## Common questions

${english}

## คำถามที่พบบ่อย (ภาษาไทย)

${thai}`;
}
