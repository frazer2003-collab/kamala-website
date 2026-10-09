import type { Metadata } from "next";
import { GuestPageClosingActions } from "@/components/guest-page-closing-actions";
import { GuestTopbar } from "@/components/guest-topbar";
import { PropertyGallery } from "@/components/property-gallery";
import { SiteFooter } from "@/components/site-footer";
import { getGuestGallerySections } from "@/lib/gallery-sections";
import { getPropertySettings } from "@/lib/property-settings";
import { buildGuestPageMetadata } from "@/lib/site-metadata";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  const description = settings.showRoomPhotosOnGallery
    ? `Photos of ${settings.propertyName}, a Thai traditional style guesthouse near Tha Pae Gate: wooden rooms, garden and courtyard.`
    : `Photos of ${settings.propertyName}, a Thai traditional style guesthouse near Tha Pae Gate: garden and courtyard.`;
  return buildGuestPageMetadata({
    settings,
    path: "/gallery",
    title: "Photos: Thai Traditional Style Guesthouse, Chiang Mai",
    description,
    absoluteTitle: true,
  });
}

export default async function GalleryPage() {
  const [settings, sections] = await Promise.all([
    getPropertySettings(),
    getGuestGallerySections(),
  ]);
  const showRooms = settings.showRoomPhotosOnGallery && sections.some((section) => section.id === "rooms");

  return (
    <main className="guest-site site-shell guest-page gallery-page">
      <GuestTopbar current="gallery" settings={settings} tone="on-dark" />

      <div className="guest-page__intro gallery-page__intro">
        <p className="section-note">Gallery</p>
        <h1>A look around {settings.propertyName}.</h1>
        <p>
          {showRooms
            ? "Room photos first, then the guesthouse, garden, and common areas near Tha Pae Gate, Chiang Mai."
            : "The guesthouse, garden, and common areas near Tha Pae Gate, Chiang Mai."}
        </p>
      </div>

      <PropertyGallery propertyName={settings.propertyName} sections={sections} />

      <GuestPageClosingActions />

      <SiteFooter settings={settings} />
    </main>
  );
}
