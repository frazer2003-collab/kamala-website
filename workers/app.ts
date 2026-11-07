/**
 * Cloudflare Worker entry — wraps OpenNext's generated fetch handler and
 * maps Cron Triggers onto the existing /api/cron/* routes (Bearer CRON_SECRET).
 */
// Generated at `opennextjs-cloudflare build` time.
// @ts-expect-error — file appears after build
import { default as handler } from "../.open-next/worker.js";

type CronEnv = {
  CRON_SECRET?: string;
  WORKER_SELF_REFERENCE: {
    fetch: (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
  };
};

const CRON_ROUTES: Record<string, string> = {
  "0 2 * * *": "/api/cron/ai-visibility",
  "15 3 * * *": "/api/cron/abandoned-checkouts",
};

async function runCron(path: string, env: CronEnv) {
  if (!env.CRON_SECRET) {
    console.error(`[cron] CRON_SECRET missing; skipped ${path}`);
    return;
  }

  const response = await env.WORKER_SELF_REFERENCE.fetch(
    `https://internal.invalid${path}`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${env.CRON_SECRET}`,
      },
    },
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error(`[cron] ${path} failed status=${response.status} ${body}`);
    return;
  }

  console.log(`[cron] ${path} ok`);
}

const worker = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetch: (handler as any).fetch.bind(handler),

  async scheduled(
    event: { cron: string },
    env: CronEnv,
    ctx: { waitUntil: (promise: Promise<unknown>) => void },
  ) {
    const path = CRON_ROUTES[event.cron];
    if (!path) {
      console.error(`[cron] no route mapped for ${event.cron}`);
      return;
    }
    ctx.waitUntil(runCron(path, env));
  },
};

export default worker;
