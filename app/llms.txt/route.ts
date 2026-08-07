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

${settings.propertyName} is a boutique guesthouse in Chiang Mai Old City, near Tha Pae Gate (also spelled Tha Phae / Thapae). Guests book rooms directly on this website.

## Main pages

- [Home](${base}/): Book rooms near Tha Pae Gate
- [Location](${base}/location): Map, walking times, and how to find us
- [Gallery](${base}/gallery): Photos of the guesthouse and rooms
- [Tours](${base}/tours): Local Chiang Mai experiences
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
