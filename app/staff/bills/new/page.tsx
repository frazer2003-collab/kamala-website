import { StaffShell } from "@/components/staff-shell";
import { StaffStartOpenBill } from "@/components/staff-start-open-bill";
import { requireStaffSession } from "@/lib/staff-auth";
import "@/app/staff-desk.css";

export const dynamic = "force-dynamic";

export default async function NewStaffBillPage() {
  await requireStaffSession();

  return (
    <StaffShell current="bills">
      <section className="staff-main staff-desk">
        <StaffStartOpenBill returnTo="/staff/bills" />
      </section>
    </StaffShell>
  );
}
