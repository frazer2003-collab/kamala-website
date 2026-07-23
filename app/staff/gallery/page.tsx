import Link from "next/link";
import { OptimizedImage } from "@/components/optimized-image";
import { StaffGalleryRoomPhotosToggle } from "@/components/staff-gallery-room-photos-toggle";
import { StaffPropertyGalleryManager } from "@/components/staff-property-gallery-manager";
import { StaffShell } from "@/components/staff-shell";
import { collectRoomGalleryPhotos } from "@/lib/gallery-sections";
import { getStaffPropertyGalleryPhotos } from "@/lib/property-gallery";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function StaffGalleryPage() {
  await requireStaffCalendarWrite();

  const [photos, rooms, settings, supabaseReady] = await Promise.all([
    getStaffPropertyGalleryPhotos(),
    getStaffRooms(),
    getPropertySettings(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);
  const roomPhotos = collectRoomGalleryPhotos(rooms);
  const showRoomPhotos = settings.showRoomPhotosOnGallery;

  return (
    <StaffShell current="gallery">
      <section className="staff-main staff-main--gallery" aria-labelledby="staff-gallery-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-gallery-title">Gallery</h1>
            <p>
              {showRoomPhotos
                ? "Guests see room photos first, then guesthouse photos on the "
                : "Guests see guesthouse photos on the "}
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
            Edit room photos in{" "}
            <Link href="/staff/settings/rooms">Settings → Rooms</Link>. Toggle whether they appear
            on the guest gallery.
          </p>
          <StaffGalleryRoomPhotosToggle
            disabled={!supabaseReady}
            showRoomPhotosOnGallery={showRoomPhotos}
          />
          {showRoomPhotos ? (
            roomPhotos.length > 0 ? (
              <ul
                className="staff-gallery-manager__preview-grid"
                aria-label="Room photos on the guest gallery"
              >
                {roomPhotos.slice(0, 8).map((photo, index) => (
                  <li key={photo.id}>
                    <div className="staff-gallery-manager__thumb">
                      <OptimizedImage
                        alt={photo.caption ?? "Room photo"}
                        className="staff-gallery-manager__thumb-image"
                        fill
                        loading={index < 4 ? "eager" : "lazy"}
                        quality={70}
                        sizes="(max-width: 720px) 30vw, 7.5rem"
                        src={photo.url}
                      />
                    </div>
                    {photo.caption ? (
                      <span className="staff-gallery-manager__caption">{photo.caption}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="staff-gallery-manager__hint">No room photos yet.</p>
            )
          ) : (
            <p className="staff-gallery-manager__hint">
              Room photos are hidden from the guest gallery.
            </p>
          )}
          {showRoomPhotos && roomPhotos.length > 8 ? (
            <p className="staff-gallery-manager__hint">
              +{roomPhotos.length - 8} more on the guest gallery.
            </p>
          ) : null}
        </section>

        <section className="staff-settings-card" aria-labelledby="gallery-property-title">
          <h2 id="gallery-property-title">Around the guesthouse</h2>
          <p className="staff-gallery-manager__hint">
            Common areas, garden, and views
            {showRoomPhotos ? " — shown after rooms for guests" : ""}.
          </p>
          <StaffPropertyGalleryManager
            disabled={!supabaseReady}
            initialPhotos={photos}
            roomsShowFirst={showRoomPhotos}
          />
        </section>
      </section>
    </StaffShell>
  );
}
