/** Staff routes that require a fresh sign-in when opened from outside /staff. */
export function isStaffProtectedPath(pathname: string) {
  const path = pathname.split("?")[0] ?? pathname;
  if (!path.startsWith("/staff")) {
    return false;
  }

  if (path === "/staff/login" || path.startsWith("/staff/login/")) {
    return false;
  }

  if (path === "/staff/portal/login" || path.startsWith("/staff/portal/login/")) {
    return false;
  }

  return true;
}

export function isDeskPortalLoginPath(pathname: string) {
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/staff/portal/login" || path.startsWith("/staff/portal/login/");
}

export function isDeskPortalProtectedPath(pathname: string) {
  const path = pathname.split("?")[0] ?? pathname;
  return (
    path === "/staff/portal/bills" ||
    path.startsWith("/staff/portal/bills/") ||
    path === "/staff/portal/laundry" ||
    path.startsWith("/staff/portal/laundry/")
  );
}

export function deskPortalKindForPath(
  pathname: string,
): "bills" | "laundry" | null {
  const path = pathname.split("?")[0] ?? pathname;
  if (path === "/staff/portal/bills" || path.startsWith("/staff/portal/bills/")) {
    return "bills";
  }
  if (path === "/staff/portal/laundry" || path.startsWith("/staff/portal/laundry/")) {
    return "laundry";
  }
  return null;
}

/**
 * True when the previous document was another staff page on the same site.
 * External entry (homepage, bookmark, typed URL, new tab) returns false.
 */
export function isInternalStaffReferer(referer: string | null, origin: string) {
  if (!referer) {
    return false;
  }

  try {
    const url = new URL(referer);
    if (url.origin !== origin) {
      return false;
    }

    return url.pathname.startsWith("/staff");
  } catch {
    return false;
  }
}

export function buildStaffLoginUrl(origin: string, nextPath: string, search = "") {
  const login = new URL("/staff/login", origin);
  login.searchParams.set("next", `${nextPath}${search}`);
  return login;
}
