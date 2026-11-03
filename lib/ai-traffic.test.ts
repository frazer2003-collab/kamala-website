import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyAiTraffic } from "./ai-traffic";

const base = { userAgent: null, referer: null, utmSource: null, isDocumentNavigation: true };

describe("classifyAiTraffic", () => {
  it("treats ChatGPT-User as a live answer fetch", () => {
    const result = classifyAiTraffic({
      ...base,
      userAgent:
        "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
      isDocumentNavigation: false,
    });
    assert.deepEqual(result, {
      kind: "answer",
      source: "chatgpt",
      agent: "ChatGPT-User",
      referrerHost: null,
    });
  });

  it("separates search, training and answer crawlers", () => {
    assert.equal(classifyAiTraffic({ ...base, userAgent: "OAI-SearchBot/1.0" })?.kind, "index");
    assert.equal(classifyAiTraffic({ ...base, userAgent: "GPTBot/1.2" })?.kind, "training");
    assert.equal(classifyAiTraffic({ ...base, userAgent: "PerplexityBot/1.0" })?.kind, "index");
    assert.equal(classifyAiTraffic({ ...base, userAgent: "Perplexity-User/1.0" })?.kind, "answer");
    assert.equal(classifyAiTraffic({ ...base, userAgent: "ClaudeBot/1.0" })?.kind, "training");
    assert.equal(classifyAiTraffic({ ...base, userAgent: "Claude-User/1.0" })?.kind, "answer");
  });

  it("counts a click-through from a ChatGPT answer by utm_source", () => {
    const result = classifyAiTraffic({
      ...base,
      userAgent: "Mozilla/5.0 (iPhone)",
      utmSource: "chatgpt.com",
    });
    assert.equal(result?.kind, "referral");
    assert.equal(result?.source, "chatgpt");
  });

  it("counts a click-through by referrer host", () => {
    const result = classifyAiTraffic({
      ...base,
      userAgent: "Mozilla/5.0",
      referer: "https://www.perplexity.ai/search/abc",
    });
    assert.equal(result?.source, "perplexity");
    assert.equal(result?.referrerHost, "www.perplexity.ai");
  });

  it("ignores prefetches and ordinary visitors", () => {
    assert.equal(
      classifyAiTraffic({ ...base, utmSource: "chatgpt.com", isDocumentNavigation: false }),
      null,
    );
    assert.equal(
      classifyAiTraffic({ ...base, userAgent: "Mozilla/5.0", referer: "https://www.google.com/" }),
      null,
    );
    assert.equal(classifyAiTraffic({ ...base, referer: "https://notchatgpt.com.evil.io/" }), null);
  });
});
