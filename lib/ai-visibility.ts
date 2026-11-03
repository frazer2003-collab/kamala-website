import type { VisibilityPrompt } from "@/lib/ai-visibility-prompts";

/** Names and domains that count as Kamala appearing in an answer. */
const BRAND_PATTERN = /kamala/i;
const OWN_DOMAIN = "kamalaguesthouse.com";

export const DEFAULT_VISIBILITY_MODEL = "gpt-4.1";

export type VisibilityResult = {
  prompt: string;
  locale: string;
  model: string;
  mentioned: boolean;
  cited: boolean;
  citedDomains: string[];
  answerExcerpt: string | null;
  error: string | null;
};

type ResponsesOutputItem = {
  type?: string;
  content?: {
    type?: string;
    text?: string;
    annotations?: { type?: string; url?: string }[];
  }[];
};

/** Prompts never checked come first, then the ones checked longest ago. */
export function choosePromptsDue(
  prompts: VisibilityPrompt[],
  lastCheckedByPrompt: Map<string, string>,
  count: number,
) {
  return [...prompts]
    .sort((left, right) => {
      const a = lastCheckedByPrompt.get(left.prompt) ?? "";
      const b = lastCheckedByPrompt.get(right.prompt) ?? "";
      return a.localeCompare(b);
    })
    .slice(0, count);
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Reads answer text and cited URLs from an OpenAI Responses API payload. */
export function parseResponsesAnswer(payload: unknown) {
  const output = (payload as { output?: ResponsesOutputItem[] } | null)?.output ?? [];
  const texts: string[] = [];
  const urls: string[] = [];

  for (const item of output) {
    if (item.type !== "message") {
      continue;
    }
    for (const part of item.content ?? []) {
      if (part.type !== "output_text") {
        continue;
      }
      if (part.text) {
        texts.push(part.text);
      }
      for (const annotation of part.annotations ?? []) {
        if (annotation.type === "url_citation" && annotation.url) {
          urls.push(annotation.url);
        }
      }
    }
  }

  return { text: texts.join("\n").trim(), urls };
}

export function scoreAnswer(text: string, urls: string[]) {
  const citedDomains = [
    ...new Set(urls.map(domainOf).filter((domain): domain is string => Boolean(domain))),
  ];
  const cited = citedDomains.some(
    (domain) => domain === OWN_DOMAIN || domain.endsWith(`.${OWN_DOMAIN}`),
  );
  const mentioned = BRAND_PATTERN.test(text) || cited;
  return { mentioned, cited, citedDomains };
}

function excerptAround(text: string) {
  if (!text) {
    return null;
  }
  const index = text.search(BRAND_PATTERN);
  const start = index > 120 ? index - 120 : 0;
  return text.slice(start, start + 600);
}

export async function runVisibilityCheck(
  entry: VisibilityPrompt,
  options: { apiKey: string; model?: string },
): Promise<VisibilityResult> {
  const model = options.model || DEFAULT_VISIBILITY_MODEL;
  const base = { prompt: entry.prompt, locale: entry.locale, model };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        tools: [{ type: "web_search" }],
        input: entry.prompt,
      }),
    });

    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        (payload as { error?: { message?: string } } | null)?.error?.message ??
        `HTTP ${response.status}`;
      return {
        ...base,
        mentioned: false,
        cited: false,
        citedDomains: [],
        answerExcerpt: null,
        error: message.slice(0, 300),
      };
    }

    const { text, urls } = parseResponsesAnswer(payload);
    return {
      ...base,
      ...scoreAnswer(text, urls),
      answerExcerpt: excerptAround(text),
      error: null,
    };
  } catch (error) {
    return {
      ...base,
      mentioned: false,
      cited: false,
      citedDomains: [],
      answerExcerpt: null,
      error: error instanceof Error ? error.message.slice(0, 300) : "Request failed",
    };
  }
}
