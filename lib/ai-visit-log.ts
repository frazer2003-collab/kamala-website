import type { NextRequest } from "next/server";
import { classifyAiTraffic } from "@/lib/ai-traffic";

function isDocumentNavigation(request: NextRequest) {
  const headers = request.headers;
  if (
    headers.get("rsc") ||
    headers.get("next-router-prefetch") ||
    headers.get("purpose") === "prefetch" ||
    headers.get("sec-purpose")?.includes("prefetch")
  ) {
    return false;
  }
  const dest = headers.get("sec-fetch-dest");
  if (dest) {
    return dest === "document";
  }
  return (headers.get("accept") ?? "").includes("text/html");
}

function clip(value: string | null, max: number) {
  if (!value) {
    return null;
  }
  return value.length > max ? value.slice(0, max) : value;
}

/** Returns a promise that records the visit, or null when it is not AI traffic. */
export function recordAiVisit(request: NextRequest): Promise<void> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }

  const userAgent = request.headers.get("user-agent");
  const classification = classifyAiTraffic({
    userAgent,
    referer: request.headers.get("referer"),
    utmSource: request.nextUrl.searchParams.get("utm_source"),
    isDocumentNavigation: isDocumentNavigation(request),
  });
  if (!classification) {
    return null;
  }

  const row = {
    kind: classification.kind,
    source: classification.source,
    agent: classification.agent,
    path: clip(request.nextUrl.pathname, 300) ?? "/",
    query: clip(request.nextUrl.search || null, 300),
    referrer_host: classification.referrerHost,
    country:
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country"),
    user_agent: clip(userAgent, 300),
  };

  return fetch(`${url}/rest/v1/ai_visits`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  })
    .then(() => undefined)
    .catch(() => undefined);
}
