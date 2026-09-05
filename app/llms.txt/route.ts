import { getPropertySettings } from "@/lib/property-settings";
import { buildHomePageDescription } from "@/lib/home-seo";
import { getMetadataBase } from "@/lib/site-metadata";

export const revalidate = 3600;

export async function GET() {
  const settings = await getPropertySettings();
  const base = getMetadataBase()?.toString().replace(/\/$/, "") ?? "https://www.kamalaguesthouse.com";
  const description = buildHomePageDescription(settings);

  const body = `# ${settings.propertyName}

> ${description}

${settings.propertyName} is a family-run Chiang Mai guesthouse (also written guest house) in the Old City, near Tha Pae Gate (also spelled Tha Phae / Thapae). Guests book rooms directly on this website.

## At a glance

- Type: garden guesthouse / guest house in Chiang Mai Old City
- Area: Tha Phae Road Soi 6, Changklan — about a two-minute walk to Thae Phae Gate
- Nearby: Sunday Walking Street across the road; Nawarat Bridge night market ~6 minutes
- Booking: choose dates and reserve on this site; staff confirm every stay

## Main pages

- [Home](${base}/): Chiang Mai guesthouse rooms near Thae Phae Gate
- [Location](${base}/location): Map, walking times, and how to find us
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
