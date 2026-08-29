import Link from "next/link";
import { StaffDiscountCodeAddForm } from "@/components/staff-discount-code-add-form";
import { StaffDiscountCodeListItem } from "@/components/staff-discount-code-list-item";
import { StaffPromotionAddForm } from "@/components/staff-promotion-add-form";
import { StaffPromotionListItem } from "@/components/staff-promotion-list-item";
import { StaffShell } from "@/components/staff-shell";
import { getTodayIso } from "@/lib/calendar";
import { getStaffDiscountCodes } from "@/lib/discount-codes";
import { getPropertySettings } from "@/lib/property-settings";
import { getStaffRoomPromotions } from "@/lib/room-promotions";
import { getStaffRooms } from "@/lib/rooms";
import { requireStaffCalendarWrite } from "@/lib/staff-auth";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-promotions.css";

export const dynamic = "force-dynamic";

type DiscountsTab = "automatic" | "codes";

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

function formatOptionalDate(iso: string | null) {
  if (!iso) {
    return "No expiry";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${iso}T00:00:00`));
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

function discountCodeTiming(
  code: { active: boolean; validUntil: string | null; maxUses: number | null; usesCount: number },
  today: string,
) {
  if (!code.active) {
    return "disabled" as const;
  }
  if (code.validUntil && code.validUntil < today) {
    return "expired" as const;
  }
  if (code.maxUses !== null && code.usesCount >= code.maxUses) {
    return "exhausted" as const;
  }
  return "live" as const;
}

function parseTab(value?: string): DiscountsTab {
  return value === "codes" ? "codes" : "automatic";
}

export default async function StaffPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; updated?: string; tab?: string }>;
}) {
  await requireStaffCalendarWrite();

  const { edit: editId, updated, tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);
  const [promotions, discountCodes, rooms, settings, supabaseReady] = await Promise.all([
    getStaffRoomPromotions(),
    getStaffDiscountCodes(),
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

  const liveCodes = discountCodes.filter(
    (code) => discountCodeTiming(code, today) === "live",
  );
  const inactiveCodes = discountCodes.filter(
    (code) => discountCodeTiming(code, today) !== "live",
  );

  return (
    <StaffShell current="promotions">
      <section className="staff-main" aria-labelledby="staff-promotions-title">
        <div className="staff-header staff-header--compact">
          <div>
            <h1 id="staff-promotions-title">Discounts</h1>
            <p>
              Automatic discounts apply on matching nights. Guest codes require entry at
              checkout.
            </p>
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
            {tab === "codes"
              ? "Guest code updated."
              : "Discount updated. Guests see the sale price on those nights."}
          </p>
        ) : null}

        <div className="staff-discounts-tabs" role="tablist" aria-label="Discount types">
          <Link
            aria-current={tab === "automatic" ? "true" : undefined}
            className={[
              "staff-discounts-tabs__tab",
              tab === "automatic" ? "staff-discounts-tabs__tab--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href="/staff/promotions?tab=automatic"
            role="tab"
          >
            Automatic discounts
          </Link>
          <Link
            aria-current={tab === "codes" ? "true" : undefined}
            className={[
              "staff-discounts-tabs__tab",
              tab === "codes" ? "staff-discounts-tabs__tab--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            href="/staff/promotions?tab=codes"
            role="tab"
          >
            Guest codes
          </Link>
        </div>

        {tab === "automatic" ? (
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
        ) : (
          <div className="staff-promotions-layout">
            <section className="staff-promotions-panel" aria-labelledby="discount-code-list-title">
              <header className="staff-promotions-panel__header">
                <h2 id="discount-code-list-title">Active codes</h2>
                <span>
                  {liveCodes.length} live
                  {inactiveCodes.length > 0 ? ` · ${inactiveCodes.length} inactive` : ""}
                </span>
              </header>

              {liveCodes.length > 0 ? (
                <ul className="staff-promotions-list">
                  {liveCodes.map((code) => (
                    <StaffDiscountCodeListItem
                      code={code}
                      key={code.id}
                      roomName={
                        code.roomId
                          ? (roomNames.get(code.roomId) ?? code.roomId)
                          : "All room types"
                      }
                      timing={discountCodeTiming(code, today)}
                      usesLabel={
                        code.maxUses === null
                          ? `${code.usesCount} uses`
                          : `${code.usesCount} / ${code.maxUses} uses`
                      }
                      validUntilLabel={formatOptionalDate(code.validUntil)}
                    />
                  ))}
                </ul>
              ) : (
                <div className="staff-promotions-panel__empty">
                  <h3>No active guest codes.</h3>
                  <p>Create a code guests can enter at checkout for a limited-time or limited-use discount.</p>
                </div>
              )}

              {inactiveCodes.length > 0 ? (
                <details className="staff-promotions-ended">
                  <summary>
                    Inactive codes <span>({inactiveCodes.length})</span>
                  </summary>
                  <ul className="staff-promotions-list staff-promotions-list--ended">
                    {inactiveCodes.map((code) => (
                      <StaffDiscountCodeListItem
                        code={code}
                        key={code.id}
                        roomName={
                          code.roomId
                            ? (roomNames.get(code.roomId) ?? code.roomId)
                            : "All room types"
                        }
                        timing={discountCodeTiming(code, today)}
                        usesLabel={
                          code.maxUses === null
                            ? `${code.usesCount} uses`
                            : `${code.usesCount} / ${code.maxUses} uses`
                        }
                        validUntilLabel={formatOptionalDate(code.validUntil)}
                      />
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>

            <section
              className="staff-settings-card staff-promotions-form-panel"
              aria-labelledby="add-discount-code-title"
            >
              <h2 id="add-discount-code-title">Create guest code</h2>
              <p className="staff-promotion-form__editing-note">
                We apply the better of an automatic discount or this code for the stay.
              </p>
              <StaffDiscountCodeAddForm disabled={!supabaseReady} rooms={rooms} />
            </section>
          </div>
        )}
      </section>
    </StaffShell>
  );
}
