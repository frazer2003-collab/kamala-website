import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy path — Finance lives at /staff/sold. */
export default async function StaffInsightsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; from?: string; to?: string }>;
}) {
  const { month, from, to } = await searchParams;
  const params = new URLSearchParams();
  if (month) {
    params.set("month", month);
  }
  if (from) {
    params.set("from", from);
  }
  if (to) {
    params.set("to", to);
  }
  const query = params.toString();
  redirect(query ? `/staff/sold?${query}` : "/staff/sold");
}
