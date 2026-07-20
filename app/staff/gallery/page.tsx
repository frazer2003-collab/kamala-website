import Link from "next/link";
import { StaffPropertyGalleryManager } from "@/components/staff-property-gallery-manager";
import { StaffShell } from "@/components/staff-shell";
import { collectRoomGalleryPhotos } from "@/lib/gallery-sections";
import { getStaffPropertyGalleryPhotos } from "@/lib/property-gallery";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StaffGalleryPage() {
  await requireStaffCalendarWrite();

  const [photos, rooms, supabaseReady] = await Promise.all([
    getStaffPropertyGalleryPhotos(),
    getStaffRooms(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);
  const roomPhotos = collectRoomGalleryPhotos(rooms);

  return (
    <StaffShell current="gallery">
      <section className="staff-main staff-main--gallery" aria-labelledby="staff-gallery-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-gallery-title">Gallery</h1>
            <p>
              Guests see room photos first, then these guesthouse photos on the{" "}
              <Link href="/gallery">gallery page</Link>.
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

        <section className="staff-settings-card" aria-labelledby="gallery-rooms-title">
          <h2 id="gallery-rooms-title">Rooms</h2>
          <p className="staff-gallery-manager__hint">
            These appear first for guests. Manage them under{" "}
            <Link href="/staff/settings/rooms">Settings → Rooms</Link>.
          </p>
          {roomPhotos.length > 0 ? (
            <ul className="staff-gallery-manager__preview-grid" aria-label="Room photos on the guest gallery">
              {roomPhotos.slice(0, 8).map((photo) => (
                <li key={photo.id}>
                  <img
                    alt={photo.caption ?? "Room photo"}
                    className="staff-gallery-manager__thumb"
                    src={photo.url}
                  />
                  {photo.caption ? (
                    <span className="staff-gallery-manager__caption">{photo.caption}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="staff-gallery-manager__hint">No room photos yet.</p>
          )}
          {roomPhotos.length > 8 ? (
            <p className="staff-gallery-manager__hint">
              +{roomPhotos.length - 8} more room photos on the guest gallery.
            </p>
          ) : null}
        </section>

        <section className="staff-settings-card" aria-labelledby="gallery-property-title">
          <h2 id="gallery-property-title">Around the guesthouse</h2>
          <p className="staff-gallery-manager__hint">
            Common areas, garden, and views. Order here matches the guest gallery (after rooms).
          </p>
          <StaffPropertyGalleryManager disabled={!supabaseReady} initialPhotos={photos} />
        </section>
      </section>
    </StaffShell>
  );
}
