import { notFound } from "next/navigation";
import { getDeskTourSale } from "@/lib/desk-ops-data";
import { formatSatang } from "@/lib/desk-money";
import { getPropertySettings } from "@/lib/property-settings";
import { requireStaffSession } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function paymentLabel(status: string) {
  switch (status) {
    case "stripe":
      return "Stripe";
    case "qr":
      return "QR / PromptPay";
    case "cash":
      return "Cash";
    default:
      return "Unpaid";
  }
}

export default async function TripSlipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffSession();
  const { id } = await params;
  const [sale, settings] = await Promise.all([
    getDeskTourSale(id),
    getPropertySettings(),
  ]);
  if (!sale) notFound();

  const tripDay = sale.tripDate || sale.saleDate;
  const propertyName = settings.propertyName?.trim() || "Kamala";

  return (
    <main className="trip-slip">
      <article className="trip-slip__card" aria-label="Trip confirmation slip">
        <header className="trip-slip__header">
          <p className="trip-slip__eyebrow">Trip &amp; tour confirmation</p>
          <h1>{propertyName}</h1>
          <p>Please keep this slip for your trip day.</p>
        </header>

        <dl className="trip-slip__grid">
          <div>
            <dt>Trip / tour</dt>
            <dd>{sale.name}</dd>
          </div>
          <div>
            <dt>Trip date</dt>
            <dd>{formatDay(tripDay)}</dd>
          </div>
          <div>
            <dt>Guest</dt>
            <dd>{sale.guestName || "—"}</dd>
          </div>
          <div>
            <dt>Guests</dt>
            <dd>{sale.guests}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{sale.guestPhone || "—"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{sale.guestEmail || "—"}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{formatSatang(sale.amountSatang)}</dd>
          </div>
          <div>
            <dt>Payment</dt>
            <dd>{paymentLabel(sale.paymentStatus)}</dd>
          </div>
          <div>
            <dt>Sold on</dt>
            <dd>{formatDay(sale.saleDate)}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{sale.id.slice(0, 8).toUpperCase()}</dd>
          </div>
        </dl>

        {sale.staffNote ? (
          <p className="trip-slip__note">
            <strong>Note:</strong> {sale.staffNote}
          </p>
        ) : null}

        <footer className="trip-slip__footer">
          <p>Save or print this page as a PDF for your records.</p>
        </footer>
      </article>

      <style>{`
        .trip-slip {
          min-height: 100vh;
          padding: 1.5rem;
          background: #f3efe8;
          color: #1c1917;
          font-family: Georgia, "Times New Roman", serif;
        }
        .trip-slip__card {
          max-width: 40rem;
          margin: 0 auto;
          padding: 1.75rem;
          border: 1px solid #d6cfc4;
          background: #fffdf8;
        }
        .trip-slip__eyebrow {
          margin: 0 0 0.35rem;
          color: #7c6f62;
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .trip-slip__header h1 {
          margin: 0;
          font-size: 1.8rem;
        }
        .trip-slip__header p {
          margin: 0.35rem 0 0;
          color: #5b5248;
        }
        .trip-slip__grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1.5rem 0 0;
        }
        .trip-slip__grid dt {
          color: #7c6f62;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .trip-slip__grid dd {
          margin: 0.2rem 0 0;
          font-size: 1.05rem;
          overflow-wrap: anywhere;
        }
        .trip-slip__note,
        .trip-slip__footer {
          margin: 1.25rem 0 0;
          color: #5b5248;
          font-size: 0.92rem;
        }
        @media print {
          .trip-slip { background: white; padding: 0; }
          .trip-slip__card { border: 0; max-width: none; }
        }
      `}</style>
    </main>
  );
}
