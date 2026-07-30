import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy path — Sold lives at /staff/sold. */
export default async function StaffInsightsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const query = month ? `?month=${encodeURIComponent(month)}` : "";
  redirect(`/staff/sold${query}`);
}
