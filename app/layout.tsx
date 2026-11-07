import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Libre_Baskerville, Plus_Jakarta_Sans } from "next/font/google";
import { getPropertySettings } from "@/lib/property-settings";
import {
  buildSiteMetadataCopy,
  buildSiteVerification,
  getMetadataBase,
} from "@/lib/site-metadata";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  // Variable font → one file covering the weight range instead of five files.
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-display",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#7a2f36",
};

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
    icons: {
      icon: [{ url: "/icon.png", type: "image/png", sizes: "32x32" }],
      apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    },
    openGraph: {
      title: defaultTitle,
      description,
      type: "website",
      siteName: propertyName,
      locale: "en_TH",
    },
    verification: buildSiteVerification(process.env),
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
