import { redirect } from "next/navigation";
import { requireStaffSession } from "@/lib/staff-auth";

export const dynamic = "force-dynamic";

/** Stock lives on Menu items — keep old bookmarks working. */
export default async function StaffStockPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  await requireStaffSession();
  const { open } = await searchParams;
  if (open) {
    redirect(`/staff/items?open=${encodeURIComponent(open)}`);
  }
  redirect("/staff/items");
}
