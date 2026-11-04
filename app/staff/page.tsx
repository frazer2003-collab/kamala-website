import { redirect } from "next/navigation";

type StaffIndexPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Legacy `/staff` inbox URLs (and bare /staff) land on Home, except booking /
 * filter / refund query links which still belong on Transfers.
 */
export default async function StaffIndexPage({ searchParams }: StaffIndexPageProps) {
  const params = await searchParams;
  const forwarded = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) {
      forwarded.set(key, value);
    } else if (Array.isArray(value) && value[0]) {
      forwarded.set(key, value[0]);
    }
  }

  const hasTransferQuery =
    forwarded.has("booking") ||
    forwarded.has("filter") ||
    forwarded.has("refund") ||
    forwarded.has("error") ||
    forwarded.has("stay-change") ||
    forwarded.has("hold-cancelled") ||
    forwarded.get("view") === "inbox";

  if (hasTransferQuery) {
    const query = forwarded.toString();
    redirect(query ? `/staff/transfers?${query}` : "/staff/transfers");
  }

  redirect("/staff/home");
}
