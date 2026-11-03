import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choosePromptsDue, parseResponsesAnswer, scoreAnswer } from "./ai-visibility";

const payload = {
  output: [
    { type: "web_search_call", id: "ws_1" },
    {
      type: "message",
      content: [
        {
          type: "output_text",
          text: "Try Kamala's Boutique Guesthouse, steps from Tha Phae Gate.",
          annotations: [
            { type: "url_citation", url: "https://www.kamalaguesthouse.com/location" },
            { type: "url_citation", url: "https://www.tripadvisor.com/Hotel_Review-x" },
          ],
        },
      ],
    },
  ],
};

describe("AI visibility scoring", () => {
  it("reads answer text and citations from a Responses payload", () => {
    const { text, urls } = parseResponsesAnswer(payload);
    assert.match(text, /Kamala/);
    assert.equal(urls.length, 2);
  });

  it("marks mention and citation of Kamala", () => {
    const { text, urls } = parseResponsesAnswer(payload);
    assert.deepEqual(scoreAnswer(text, urls), {
      mentioned: true,
      cited: true,
      citedDomains: ["kamalaguesthouse.com", "tripadvisor.com"],
    });
  });

  it("reports competitors-only answers as not mentioned", () => {
    const result = scoreAnswer("Stay at Example Lodge.", ["https://booking.com/hotel/x"]);
    assert.equal(result.mentioned, false);
    assert.equal(result.cited, false);
    assert.deepEqual(result.citedDomains, ["booking.com"]);
  });

  it("checks never-tested prompts first, then the stalest", () => {
    const prompts = [
      { prompt: "a", locale: "en" as const },
      { prompt: "b", locale: "en" as const },
      { prompt: "c", locale: "en" as const },
    ];
    const last = new Map([
      ["a", "2026-10-10T00:00:00Z"],
      ["c", "2026-10-01T00:00:00Z"],
    ]);
    assert.deepEqual(
      choosePromptsDue(prompts, last, 2).map((entry) => entry.prompt),
      ["b", "c"],
    );
  });

  it("tolerates empty or malformed payloads", () => {
    assert.deepEqual(parseResponsesAnswer(null), { text: "", urls: [] });
    assert.deepEqual(parseResponsesAnswer({ output: "nope" as unknown as [] }), {
      text: "",
      urls: [],
    });
  });
});
