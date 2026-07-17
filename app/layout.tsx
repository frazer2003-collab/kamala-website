import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Libre_Baskerville, Plus_Jakarta_Sans } from "next/font/google";
import { getPropertySettings } from "@/lib/property-settings";
import { buildSiteMetadataCopy, getMetadataBase } from "@/lib/site-metadata";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-display",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  const { defaultTitle, description, propertyName } = buildSiteMetadataCopy(settings);

  return {
    metadataBase: getMetadataBase(),
    title: {
      default: defaultTitle,
      template: `%s · ${propertyName}`,
    },
    description,
    openGraph: {
      title: defaultTitle,
      description,
      type: "website",
      siteName: propertyName,
      locale: "en_TH",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={libreBaskerville.variable} lang="en">
      <body className={plusJakarta.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
