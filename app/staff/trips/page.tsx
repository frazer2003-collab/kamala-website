import { StaffDeskRangeBand } from "@/components/staff-desk-range-band";
import { StaffDeskTrips } from "@/components/staff-desk-trips";
import { StaffShell } from "@/components/staff-shell";
import { listDeskTourSalesInRange } from "@/lib/desk-ops-data";
import { deskListReturnTo, parseDeskListRange } from "@/lib/desk-range";
import { requireStaffSession } from "@/lib/staff-auth";
import { getStaffLocale } from "@/lib/staff-locale-server";
import { staffT } from "@/lib/staff-i18n";
import { hasStaffSupabaseConfig } from "@/lib/supabase";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function StaffTripsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    from?: string;
    to?: string;
    view?: string;
  }>;
}) {
  await requireStaffSession();
  const locale = await getStaffLocale();
  const params = await searchParams;
  const { fromIso, toIso, monthKey, todayIso } = parseDeskListRange(params);
  const returnTo = deskListReturnTo("/staff/trips", fromIso, toIso, monthKey);
  const range = hasStaffSupabaseConfig()
    ? await listDeskTourSalesInRange(fromIso, toIso)
    : { sales: [], totalSatang: 0, count: 0 };

  return (
    <StaffShell current="trips">
      <section
        className="staff-main staff-desk staff-desk--fill"
        aria-labelledby="desk-trips-title"
      >
        <header className="staff-header staff-header--compact staff-desk__header">
          <div>
            <h1 id="desk-trips-title">{staffT(locale, "trips.title")}</h1>
          </div>
        </header>

        <StaffDeskRangeBand
          fromIso={fromIso}
          locale={locale}
          monthKey={monthKey}
          pathname="/staff/trips"
          toIso={toIso}
          todayIso={todayIso}
        />

        {!hasStaffSupabaseConfig() ? (
          <p className="form-message form-message--setup" role="status">
            Desk data is not connected yet. Finish Supabase setup, then reload.
          </p>
        ) : (
          <StaffDeskTrips
            returnTo={returnTo}
            sales={range.sales}
            todayIso={todayIso}
            totalSatang={range.totalSatang}
          />
        )}
      </section>
    </StaffShell>
  );
}
