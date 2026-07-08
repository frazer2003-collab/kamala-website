import Link from "next/link";
import { removeRoomPromotion } from "@/app/staff/auth-actions";
import { StaffPromotionAddForm } from "@/components/staff-promotion-add-form";
import { StaffSidebar } from "@/components/staff-sidebar";
import { getTodayIso } from "@/lib/calendar";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffSession } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function formatPromotionDates(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startDate} to ${endDate}`;
  }

  return `${formatter.format(start)} to ${formatter.format(end)}`;
}

export default async function StaffPromotionsPage() {
  await requireStaffSession();

  const [promotions, rooms, supabaseReady] = await Promise.all([
    getStaffRoomPromotions(),
    getStaffRooms(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const today = getTodayIso();
  const activePromotions = promotions
    .filter((promotion) => promotion.endDate >= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));

  return (
    <main className="staff-shell">
      <StaffSidebar current="promotions" />

      <section className="staff-main" aria-labelledby="staff-promotions-title">
        <div className="staff-header">
          <div>
            <p className="section-note">Staff promotions</p>
            <h1 id="staff-promotions-title">Room offers by date.</h1>
            <p>
              Set a percentage discount for a room type across any date range.
              Guests see the sale price on the homepage, calendar, and booking
              form, and pay the matching deposit at checkout.
            </p>
          </div>
          <Link className="button button--secondary" href="/staff">
            Back to requests
          </Link>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing promotions here.
          </p>
        ) : null}

        <div className="staff-settings-grid">
          <section className="staff-settings-card" aria-labelledby="add-promotion-title">
            <h2 id="add-promotion-title">Add promotion</h2>
            <StaffPromotionAddForm disabled={!supabaseReady} rooms={rooms} />
          </section>

          <section className="staff-promotions-panel" aria-labelledby="promotion-list-title">
            <header className="staff-promotions-panel__header">
              <h2 id="promotion-list-title">Scheduled offers</h2>
              <span>
                {activePromotions.length} active
                {promotions.length > activePromotions.length
                  ? ` · ${promotions.length - activePromotions.length} ended`
                  : ""}
              </span>
            </header>

            {activePromotions.length > 0 ? (
              <ul className="staff-promotions-list">
                {activePromotions.map((promotion) => (
                  <li className="staff-promotions-list__item" key={promotion.id}>
                    <div className="staff-promotions-list__main">
                      <strong>{roomNames.get(promotion.roomId) ?? promotion.roomId}</strong>
                      <span className="staff-promotions-list__meta">
                        <span className="staff-promotions-list__rate">
                          {promotion.percentOff}% off
                        </span>
                        <span className="staff-promotions-list__dates">
                          {formatPromotionDates(promotion.startDate, promotion.endDate)}
                        </span>
                      </span>
                      {promotion.label ? (
                        <span className="staff-promotions-list__label">{promotion.label}</span>
                      ) : null}
                    </div>
                    <form action={removeRoomPromotion}>
                      <input name="promotion-id" type="hidden" value={promotion.id} />
                      <button className="button button--quiet" type="submit">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="staff-promotions-panel__empty">
                <h3>No active promotions.</h3>
                <p>
                  Standard room rates apply until you add a percentage discount
                  for specific dates.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
