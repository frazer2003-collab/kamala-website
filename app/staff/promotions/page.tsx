import Link from "next/link";
import { StaffPromotionAddForm } from "@/components/staff-promotion-add-form";
import { StaffPromotionListItem } from "@/components/staff-promotion-list-item";
import { StaffSidebar } from "@/components/staff-sidebar";
import { getTodayIso } from "@/lib/calendar";
import { getPropertySettings } from "@/lib/property-settings";
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

function promotionTiming(startDate: string, endDate: string, today: string) {
  if (endDate < today) {
    return "ended" as const;
  }
  if (startDate > today) {
    return "upcoming" as const;
  }
  return "live" as const;
}

export default async function StaffPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; updated?: string }>;
}) {
  await requireStaffSession();

  const { edit: editId, updated } = await searchParams;
  const [promotions, rooms, settings, supabaseReady] = await Promise.all([
    getStaffRoomPromotions(),
    getStaffRooms(),
    getPropertySettings(),
    Promise.resolve(hasStaffSupabaseConfig()),
  ]);
  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));
  const today = getTodayIso();
  const activePromotions = promotions
    .filter((promotion) => promotion.endDate >= today)
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
  const endedPromotions = promotions
    .filter((promotion) => promotion.endDate < today)
    .sort((left, right) => right.endDate.localeCompare(left.endDate));
  const editing = editId ? promotions.find((promotion) => promotion.id === editId) ?? null : null;
  const showUpdated = updated === "1" && !editing;

  return (
    <main className="staff-shell">
      <StaffSidebar current="promotions" />

      <section className="staff-main" aria-labelledby="staff-promotions-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-promotions-title">Discounts</h1>
            <p>Percentage off for specific nights. Guests see the sale price when booking.</p>
          </div>
          <Link className="button button--secondary" href="/staff">
            Back to requests
          </Link>
        </div>

        {!supabaseReady ? (
          <p className="form-message form-message--setup" role="status">
            Add Supabase environment variables before managing discounts here.
          </p>
        ) : null}

        {showUpdated ? (
          <p className="form-message form-message--success" role="status">
            Discount updated. Guests see the sale price on those nights.
          </p>
        ) : null}

        <div
          className={`staff-promotions-layout${editing ? " staff-promotions-layout--editing" : ""}`}
        >
          <section className="staff-promotions-panel" aria-labelledby="promotion-list-title">
            <header className="staff-promotions-panel__header">
              <h2 id="promotion-list-title">Current &amp; upcoming</h2>
              <span>
                {activePromotions.length} active
                {endedPromotions.length > 0 ? ` · ${endedPromotions.length} ended` : ""}
              </span>
            </header>

            {activePromotions.length > 0 ? (
              <ul className="staff-promotions-list">
                {activePromotions.map((promotion) => (
                  <StaffPromotionListItem
                    dateLabel={formatPromotionDates(promotion.startDate, promotion.endDate)}
                    editing={editing?.id === promotion.id}
                    key={promotion.id}
                    promotion={promotion}
                    roomName={roomNames.get(promotion.roomId) ?? promotion.roomId}
                    timing={promotionTiming(promotion.startDate, promotion.endDate, today)}
                  />
                ))}
              </ul>
            ) : (
              <div className="staff-promotions-panel__empty">
                <h3>No active discounts.</h3>
                <p>Standard room rates apply until you add a percentage off for specific nights.</p>
              </div>
            )}

            {endedPromotions.length > 0 ? (
              <details className="staff-promotions-ended">
                <summary>
                  Ended discounts <span>({endedPromotions.length})</span>
                </summary>
                <ul className="staff-promotions-list staff-promotions-list--ended">
                  {endedPromotions.map((promotion) => (
                    <StaffPromotionListItem
                      dateLabel={formatPromotionDates(promotion.startDate, promotion.endDate)}
                      editing={false}
                      key={promotion.id}
                      promotion={promotion}
                      roomName={roomNames.get(promotion.roomId) ?? promotion.roomId}
                      timing="ended"
                    />
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <section
            className="staff-settings-card staff-promotions-form-panel"
            aria-labelledby="add-promotion-title"
          >
            <h2 id="add-promotion-title">{editing ? "Edit discount" : "Add discount"}</h2>
            {editing ? (
              <p className="staff-promotion-form__editing-note">
                Updating {roomNames.get(editing.roomId) ?? "this room"} ·{" "}
                {formatPromotionDates(editing.startDate, editing.endDate)}
              </p>
            ) : null}
            <StaffPromotionAddForm
              currency={settings.currency}
              disabled={!supabaseReady}
              editing={editing}
              existingPromotions={promotions}
              key={editing?.id ?? "new"}
              rooms={rooms}
            />
          </section>
        </div>
      </section>
    </main>
  );
}
