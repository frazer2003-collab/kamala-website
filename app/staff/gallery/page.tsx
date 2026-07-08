import Link from "next/link";
import { StaffPropertyGalleryManager } from "@/components/staff-property-gallery-manager";
import { StaffSidebar } from "@/components/staff-sidebar";
import { getStaffPropertyGalleryPhotos } from "@/lib/property-gallery";
import { requireStaffSession } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StaffGalleryPage() {
  await requireStaffSession();

  const [photos, supabaseReady] = await Promise.all([
    getStaffPropertyGalleryPhotos(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);

  return (
    <main className="staff-shell">
      <StaffSidebar current="gallery" />

      <section className="staff-main staff-main--gallery" aria-labelledby="staff-gallery-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Guest site gallery</p>
            <h1 id="staff-gallery-title">Property photo gallery.</h1>
            <p>
              Upload photos here for the public gallery. Guests see them on the{" "}
              <a href="/gallery">gallery page</a> — no login required.
            </p>
          </div>
          <Link className="button button--secondary" href="/gallery">
            View gallery page
          </Link>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing gallery photos here.
          </p>
        ) : null}

        <section className="staff-settings-card">
          <StaffPropertyGalleryManager disabled={!supabaseReady} initialPhotos={photos} />
        </section>
      </section>
    </main>
  );
}
