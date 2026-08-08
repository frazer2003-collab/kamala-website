import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy URL — finance/settings no longer use a second passcode gate. */
export default async function StaffPasscodeRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (
    next?.startsWith("/staff/") &&
    !next.startsWith("/staff/login") &&
    !next.startsWith("/staff/passcode")
  ) {
    redirect(next);
  }
  redirect("/staff/sold");
}
