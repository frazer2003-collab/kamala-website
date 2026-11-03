/**
 * Recognises AI assistant traffic. Edge-safe: used from middleware.
 *
 * - "answer": an assistant fetched the page live while answering someone's question.
 * - "index": an assistant's search crawler building its index.
 * - "training": a model-training crawler.
 * - "referral": a person clicked through from an assistant's answer.
 */

export type AiVisitKind = "answer" | "index" | "training" | "referral";

export type AiVisitSource =
  | "chatgpt"
  | "perplexity"
  | "claude"
  | "gemini"
  | "copilot"
  | "meta"
  | "mistral"
  | "duckduckgo"
  | "deepseek";

export type AiVisitClassification = {
  kind: AiVisitKind;
  source: AiVisitSource;
  agent: string | null;
  referrerHost: string | null;
};

const AGENT_PATTERNS: { token: string; source: AiVisitSource; kind: AiVisitKind }[] = [
  { token: "ChatGPT-User", source: "chatgpt", kind: "answer" },
  { token: "OAI-SearchBot", source: "chatgpt", kind: "index" },
  { token: "GPTBot", source: "chatgpt", kind: "training" },
  { token: "Perplexity-User", source: "perplexity", kind: "answer" },
  { token: "PerplexityBot", source: "perplexity", kind: "index" },
  { token: "Claude-User", source: "claude", kind: "answer" },
  { token: "Claude-SearchBot", source: "claude", kind: "index" },
  { token: "ClaudeBot", source: "claude", kind: "training" },
  { token: "MistralAI-User", source: "mistral", kind: "answer" },
  { token: "DuckAssistBot", source: "duckduckgo", kind: "answer" },
  { token: "meta-externalfetcher", source: "meta", kind: "answer" },
  { token: "meta-externalagent", source: "meta", kind: "training" },
];

const REFERRER_HOSTS: { host: string; source: AiVisitSource }[] = [
  { host: "chatgpt.com", source: "chatgpt" },
  { host: "chat.openai.com", source: "chatgpt" },
  { host: "perplexity.ai", source: "perplexity" },
  { host: "claude.ai", source: "claude" },
  { host: "gemini.google.com", source: "gemini" },
  { host: "copilot.microsoft.com", source: "copilot" },
  { host: "chat.mistral.ai", source: "mistral" },
  { host: "chat.deepseek.com", source: "deepseek" },
  { host: "meta.ai", source: "meta" },
];

const UTM_SOURCES: Record<string, AiVisitSource> = {
  "chatgpt.com": "chatgpt",
  chatgpt: "chatgpt",
  openai: "chatgpt",
  "perplexity.ai": "perplexity",
  perplexity: "perplexity",
  "claude.ai": "claude",
  claude: "claude",
  gemini: "gemini",
  "gemini.google.com": "gemini",
  copilot: "copilot",
  "copilot.microsoft.com": "copilot",
};

function hostMatches(host: string, domain: string) {
  return host === domain || host.endsWith(`.${domain}`);
}

function referrerHostOf(referer: string | null) {
  if (!referer) {
    return null;
  }
  try {
    return new URL(referer).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export type AiTrafficInput = {
  userAgent: string | null;
  referer: string | null;
  utmSource: string | null;
  /** Full page navigation by a person (not a prefetch, RSC payload or asset). */
  isDocumentNavigation: boolean;
};

export function classifyAiTraffic(input: AiTrafficInput): AiVisitClassification | null {
  const userAgent = input.userAgent ?? "";
  const lowerAgent = userAgent.toLowerCase();

  for (const pattern of AGENT_PATTERNS) {
    if (lowerAgent.includes(pattern.token.toLowerCase())) {
      return {
        kind: pattern.kind,
        source: pattern.source,
        agent: pattern.token,
        referrerHost: null,
      };
    }
  }

  if (!input.isDocumentNavigation) {
    return null;
  }

  const referrerHost = referrerHostOf(input.referer);
  if (referrerHost) {
    const match = REFERRER_HOSTS.find((entry) => hostMatches(referrerHost, entry.host));
    if (match) {
      return { kind: "referral", source: match.source, agent: null, referrerHost };
    }
  }

  const utm = input.utmSource?.trim().toLowerCase();
  if (utm && UTM_SOURCES[utm]) {
    return { kind: "referral", source: UTM_SOURCES[utm], agent: null, referrerHost };
  }

  return null;
}

export const AI_SOURCE_LABELS: Record<AiVisitSource, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  claude: "Claude",
  gemini: "Gemini",
  copilot: "Copilot",
  meta: "Meta AI",
  mistral: "Mistral",
  duckduckgo: "DuckDuckGo AI",
  deepseek: "DeepSeek",
};

export const AI_KIND_LABELS: Record<AiVisitKind, string> = {
  answer: "Read a page to answer a question",
  index: "Search index crawl",
  training: "Training crawl",
  referral: "Guest clicked through",
};
