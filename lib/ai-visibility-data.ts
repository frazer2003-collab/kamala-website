import { AI_VISIBILITY_PROMPTS } from "@/lib/ai-visibility-prompts";
import { choosePromptsDue, type VisibilityResult } from "@/lib/ai-visibility";
import { foundViaLabel } from "@/lib/found-via";
import { createStaffSupabaseClient, hasStaffSupabaseConfig } from "@/lib/supabase";

export async function getPromptsDue(count: number) {
  const supabase = createStaffSupabaseClient();
  const { data, error } = await supabase
    .from("ai_visibility_checks")
    .select("prompt, checked_at")
    .order("checked_at", { ascending: false })
    .limit(1000);
  if (error) {
    throw new Error(error.message);
  }
  const lastChecked = new Map<string, string>();
  for (const row of data ?? []) {
    if (!lastChecked.has(row.prompt)) {
      lastChecked.set(row.prompt, row.checked_at);
    }
  }
  return choosePromptsDue(AI_VISIBILITY_PROMPTS, lastChecked, count);
}

export async function saveVisibilityResults(results: VisibilityResult[]) {
  if (results.length === 0) {
    return;
  }
  const { error } = await createStaffSupabaseClient()
    .from("ai_visibility_checks")
    .insert(
      results.map((result) => ({
        prompt: result.prompt,
        locale: result.locale,
        model: result.model,
        mentioned: result.mentioned,
        cited: result.cited,
        cited_domains: result.citedDomains,
        answer_excerpt: result.answerExcerpt,
        error: result.error,
      })),
    );
  if (error) {
    throw new Error(error.message);
  }
}

export type AiInsights = {
  ready: boolean;
  days: number;
  visits: {
    bySource: { source: string; answer: number; index: number; training: number; referral: number }[];
    answerPages: { path: string; count: number }[];
    referralPages: { path: string; count: number }[];
    recent: {
      at: string;
      kind: string;
      source: string;
      path: string;
      country: string | null;
    }[];
  };
  checks: {
    latest: {
      prompt: string;
      locale: string;
      checkedAt: string;
      mentioned: boolean;
      cited: boolean;
      error: string | null;
      excerpt: string | null;
    }[];
    mentionRate: number | null;
    topDomains: { domain: string; count: number }[];
    neverChecked: number;
  };
  guests: {
    counts: { label: string; count: number }[];
    answers: { at: string; label: string; detail: string }[];
    totalAnswered: number;
  };
};

function countBy<T>(items: T[], key: (item: T) => string) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = key(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count);
}

const EMPTY: Omit<AiInsights, "ready" | "days"> = {
  visits: { bySource: [], answerPages: [], referralPages: [], recent: [] },
  checks: { latest: [], mentionRate: null, topDomains: [], neverChecked: AI_VISIBILITY_PROMPTS.length },
  guests: { counts: [], answers: [], totalAnswered: 0 },
};

export async function loadAiInsights(days = 30): Promise<AiInsights> {
  if (!hasStaffSupabaseConfig()) {
    return { ready: false, days, ...EMPTY };
  }

  const supabase = createStaffSupabaseClient();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [visitsResult, checksResult, guestsResult] = await Promise.all([
    supabase
      .from("ai_visits")
      .select("created_at, kind, source, path, country")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("ai_visibility_checks")
      .select("prompt, locale, checked_at, mentioned, cited, cited_domains, answer_excerpt, error")
      .order("checked_at", { ascending: false })
      .limit(1000),
    supabase
      .from("booking_requests")
      .select("created_at, found_via, found_via_detail")
      .not("found_via", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const visits = visitsResult.data ?? [];
  const sources = new Map<string, AiInsights["visits"]["bySource"][number]>();
  for (const visit of visits) {
    const entry =
      sources.get(visit.source) ??
      { source: visit.source, answer: 0, index: 0, training: 0, referral: 0 };
    entry[visit.kind] += 1;
    sources.set(visit.source, entry);
  }

  const latestByPrompt = new Map<string, NonNullable<typeof checksResult.data>[number]>();
  for (const check of checksResult.data ?? []) {
    if (!latestByPrompt.has(check.prompt)) {
      latestByPrompt.set(check.prompt, check);
    }
  }
  const latest = [...latestByPrompt.values()];
  const scored = latest.filter((check) => !check.error);
  const recentChecks = (checksResult.data ?? []).filter(
    (check) => !check.error && check.checked_at >= since,
  );

  const guests = guestsResult.data ?? [];

  return {
    ready: true,
    days,
    visits: {
      bySource: [...sources.values()].sort(
        (left, right) =>
          right.answer + right.referral - (left.answer + left.referral),
      ),
      answerPages: countBy(
        visits.filter((visit) => visit.kind === "answer"),
        (visit) => visit.path,
      )
        .slice(0, 10)
        .map(({ value, count }) => ({ path: value, count })),
      referralPages: countBy(
        visits.filter((visit) => visit.kind === "referral"),
        (visit) => visit.path,
      )
        .slice(0, 10)
        .map(({ value, count }) => ({ path: value, count })),
      recent: visits
        .filter((visit) => visit.kind === "answer" || visit.kind === "referral")
        .slice(0, 25)
        .map((visit) => ({
          at: visit.created_at,
          kind: visit.kind,
          source: visit.source,
          path: visit.path,
          country: visit.country,
        })),
    },
    checks: {
      latest: latest
        .sort((left, right) => Number(right.mentioned) - Number(left.mentioned))
        .map((check) => ({
          prompt: check.prompt,
          locale: check.locale,
          checkedAt: check.checked_at,
          mentioned: check.mentioned,
          cited: check.cited,
          error: check.error,
          excerpt: check.answer_excerpt,
        })),
      mentionRate:
        scored.length > 0
          ? Math.round((scored.filter((check) => check.mentioned).length / scored.length) * 100)
          : null,
      topDomains: countBy(
        recentChecks.flatMap((check) => check.cited_domains),
        (domain) => domain,
      )
        .slice(0, 12)
        .map(({ value, count }) => ({ domain: value, count })),
      neverChecked: AI_VISIBILITY_PROMPTS.filter((entry) => !latestByPrompt.has(entry.prompt))
        .length,
    },
    guests: {
      counts: countBy(guests, (guest) => guest.found_via ?? "").map(({ value, count }) => ({
        label: foundViaLabel(value) ?? value,
        count,
      })),
      answers: guests
        .filter((guest) => guest.found_via_detail)
        .slice(0, 25)
        .map((guest) => ({
          at: guest.created_at,
          label: foundViaLabel(guest.found_via) ?? guest.found_via ?? "",
          detail: guest.found_via_detail ?? "",
        })),
      totalAnswered: guests.length,
    },
  };
}
