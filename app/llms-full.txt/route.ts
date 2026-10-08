import { buildHomePageDescription } from "@/lib/home-seo";
import { buildLlmsFaqSection, buildLlmsLocationSection } from "@/lib/llms-text";
import { getPropertySettings } from "@/lib/property-settings";
import { getMetadataBase } from "@/lib/site-metadata";
import { GUESTHOUSE_PET_POLICY, GUESTHOUSE_STYLE } from "@/lib/tha-phae-seo";

export const revalidate = 3600;

export async function GET() {
  const settings = await getPropertySettings();
  const base = getMetadataBase()?.toString().replace(/\/$/, "") ?? "https://www.kamalaguesthouse.com";

  const contact = [
    settings.contactPhone ? `- Phone: ${settings.contactPhone}` : null,
    settings.contactEmail ? `- Email: ${settings.contactEmail}` : null,
    settings.addressLine ? `- Address: ${settings.addressLine}` : null,
    `- Website: ${base}/`,
  ]
    .filter(Boolean)
    .join("\n");

  const body = `# ${settings.propertyName}

> ${buildHomePageDescription(settings)}

${settings.propertyName} is a family-run, pet-friendly, ${GUESTHOUSE_STYLE} guesthouse in Chiang Mai, Thailand, next to Tha Phae Gate at the edge of the Old City. Rooms are booked directly on ${base}/ and breakfast is included.

${buildLlmsLocationSection(settings, base)}

## Stay details

- Style: ${GUESTHOUSE_STYLE}, with wooden rooms around a courtyard garden
- Pets: ${GUESTHOUSE_PET_POLICY}
- Check-in: ${settings.checkInFrom} to ${settings.checkInUntil}
- Booking terms: ${settings.termsSummary}
- Cancellation: ${settings.cancellationPolicy}

${buildLlmsFaqSection(settings)}

## Contact

${contact}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
