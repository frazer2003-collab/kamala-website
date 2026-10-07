import { getPropertySettings } from "@/lib/property-settings";
import { buildHomePageDescription } from "@/lib/home-seo";
import { buildLlmsLocationSection } from "@/lib/llms-text";
import { getMetadataBase } from "@/lib/site-metadata";

export const revalidate = 3600;

export async function GET() {
  const settings = await getPropertySettings();
  const base = getMetadataBase()?.toString().replace(/\/$/, "") ?? "https://www.kamalaguesthouse.com";
  const description = buildHomePageDescription(settings);

  const body = `# ${settings.propertyName}

> ${description}

${settings.propertyName} is a family-run Chiang Mai guesthouse (also written guest house) at the edge of the Old City, near Tha Phae Gate (also spelled Tha Pae / Thapae). Guests book rooms directly on this website.

## At a glance

- Type: family-run garden guesthouse (guest house) by Chiang Mai Old City
- Area: Tha Phae Road Soi 6, Changklan, about a two-minute walk to Tha Phae Gate
- Nearby: Sunday Walking Street starts at the gate; Night Bazaar and Warorot Market about 10 to 12 minutes on foot
- Breakfast: included with rooms booked on this site
- Booking: choose dates and reserve on this site; staff confirm every stay

${buildLlmsLocationSection(settings, base)}

More detail, including common questions in English and Thai: ${base}/llms-full.txt

## Main pages

- [Home](${base}/): Chiang Mai guesthouse rooms near Tha Phae Gate
- [Location](${base}/location): Map, distances, getting here from the airport, FAQ in English and Thai
- [Gallery](${base}/gallery): Photos of the guesthouse and rooms
- [Tours](${base}/tours): Local Chiang Mai experiences
- [Contact](${base}/contact): Message the house
- [Privacy](${base}/privacy)
- [Terms](${base}/terms)
- [Cancellation](${base}/cancellation)

## Contact

${settings.contactPhone ? `- Phone: ${settings.contactPhone}` : ""}
${settings.contactEmail ? `- Email: ${settings.contactEmail}` : ""}
${settings.addressLine ? `- Address: ${settings.addressLine}` : ""}
`.trim();

  return new Response(`${body}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
