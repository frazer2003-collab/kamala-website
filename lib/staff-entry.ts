/** Staff routes that require a fresh sign-in when opened from outside /staff. */
export function isStaffProtectedPath(pathname: string) {
  const path = pathname.split("?")[0] ?? pathname;
  if (!path.startsWith("/staff")) {
    return false;
  }

  return path !== "/staff/login" && !path.startsWith("/staff/login/");
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
