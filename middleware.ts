import { NextResponse, type NextRequest } from "next/server";
import {
  buildStaffLoginUrl,
  isInternalStaffReferer,
  isStaffProtectedPath,
} from "@/lib/staff-entry";
import {
  readStaffSessionFromToken,
  STAFF_SESSION_COOKIE_NAME,
  STAFF_SENSITIVE_COOKIE_NAME,
} from "@/lib/staff-auth";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isStaffProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const origin = request.nextUrl.origin;
  const token = request.cookies.get(STAFF_SESSION_COOKIE_NAME)?.value;
  const session = readStaffSessionFromToken(token);
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
  matcher: ["/staff", "/staff/:path*"],
};
