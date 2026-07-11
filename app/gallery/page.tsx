import type { Metadata } from "next";
import Link from "next/link";
import { GuestTopbar } from "@/components/guest-topbar";
import { PropertyGallery } from "@/components/property-gallery";
import { SiteFooter } from "@/components/site-footer";
import { getPublicPropertyGalleryPhotos } from "@/lib/property-gallery";
import { getPropertySettings } from "@/lib/property-settings";

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPropertySettings();
  return {
    title: `Gallery · ${settings.propertyName}`,
    description: `Photos of ${settings.propertyName} — the guesthouse, garden, and surroundings.`,
  };
}

export default async function GalleryPage() {
  const [settings, photos] = await Promise.all([
    getPropertySettings(),
    getPublicPropertyGalleryPhotos(),
  ]);

  return (
    <main className="guest-site site-shell guest-page gallery-page">
      <GuestTopbar current="gallery" settings={settings} tone="on-dark" />

      <div className="guest-page__intro gallery-page__intro">
        <p className="section-note">Gallery</p>
        <h1>A look around {settings.propertyName}.</h1>
        <p>
          Photos of the guesthouse, garden, and common areas.
        </p>
      </div>

      <PropertyGallery photos={photos} propertyName={settings.propertyName} />

      <div className="guest-page__actions gallery-page__actions">
        <Link className="button button--secondary" href="/">
          Back to home
        </Link>
        <Link className="button button--primary" href="/#booking">
          Request a stay
        </Link>
      </div>

      <SiteFooter settings={settings} />
    </main>
  );
}
