import Link from "next/link";
import { createStaffSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function BookingCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ booking_id?: string }>;
}) {
  const { booking_id: bookingId } = await searchParams;

  if (bookingId) {
    try {
      const supabase = createStaffSupabaseClient();
      await supabase
        .from("booking_requests")
        .delete()
        .eq("id", bookingId)
        .eq("status", "pending_payment");
    } catch {
      // Unpaid bookings can be cleaned up manually if needed.
    }
  }

  return (
    <main className="site-shell">
      <section className="section booking-result">
        <p className="section-note">Payment cancelled</p>
        <h1>No deposit was taken.</h1>
        <p>
          Your room was not reserved. You can return to the booking form and try
          again when you are ready.
        </p>
        <Link className="button button--primary" href="/#booking">
          Return to booking form
        </Link>
      </section>
    </main>
  );
}
