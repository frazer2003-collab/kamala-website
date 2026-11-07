import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { recordAiVisit } from "@/lib/ai-visit-log";
import {
  STAFF_PORTAL_COOKIE_NAME,
  readDeskPortalFromTokenEdge,
} from "@/lib/desk-portal-edge";
import {
  buildStaffLoginUrl,
  deskPortalKindForPath,
  isDeskPortalProtectedPath,
  isInternalStaffReferer,
  isStaffProtectedPath,
} from "@/lib/staff-entry";
import {
  readStaffSessionFromTokenEdge,
  STAFF_SESSION_COOKIE_NAME,
  STAFF_SENSITIVE_COOKIE_NAME,
} from "@/lib/staff-session-edge";

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname, search } = request.nextUrl;

  if (!isStaffProtectedPath(pathname)) {
    const visit = recordAiVisit(request);
    if (visit) {
      event.waitUntil(visit);
    }
    return NextResponse.next();
  }

  const origin = request.nextUrl.origin;

  if (isDeskPortalProtectedPath(pathname)) {
    const needed = deskPortalKindForPath(pathname);
    const portalToken = request.cookies.get(STAFF_PORTAL_COOKIE_NAME)?.value;
    const portal = await readDeskPortalFromTokenEdge(portalToken);
    if (portal && needed && portal.kind === needed) {
      return NextResponse.next();
    }

    const staffToken = request.cookies.get(STAFF_SESSION_COOKIE_NAME)?.value;
    const staffSession = await readStaffSessionFromTokenEdge(staffToken);
    if (staffSession) {
      const internalStaffNav = isInternalStaffReferer(
        request.headers.get("referer"),
        origin,
      );
      if (internalStaffNav) {
        return NextResponse.next();
      }
    }

    const login = new URL("/staff/portal/login", origin);
    if (needed) login.searchParams.set("portal", needed);
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  const token = request.cookies.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const session = await readStaffSessionFromTokenEdge(token);
  const internalStaffNav = isInternalStaffReferer(
    request.headers.get("referer"),
    origin,
  );

  if (!session) {
    return NextResponse.redirect(buildStaffLoginUrl(origin, pathname, search));
  }

  if (!internalStaffNav) {
    const login = buildStaffLoginUrl(origin, pathname, search);
    const response = NextResponse.redirect(login);
    response.cookies.delete(STAFF_SESSION_COOKIE_NAME);
    response.cookies.delete(STAFF_SENSITIVE_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/staff",
    "/staff/:path*",
    "/((?!_next/static|_next/image|api/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|webp|avif|gif|svg|ico|woff2?|css|js|map)$).*)",
  ],
};
