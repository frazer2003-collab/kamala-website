export type RoomSummaryIconKey =
  | "bathroom"
  | "garden"
  | "ground"
  | "bed"
  | "family"
  | "location"
  | "quiet"
  | "fridge"
  | "desk"
  | "size"
  | "room";

const ICON_RULES: Array<{ key: RoomSummaryIconKey; test: RegExp }> = [
  { key: "bathroom", test: /bathroom|en-?suite|shower|bidet/i },
  { key: "garden", test: /balcony|garden|greenery/i },
  { key: "ground", test: /ground[-\s]?floor|without stairs|not to climb/i },
  { key: "family", test: /\bfamil(y|ies)\b|young children/i },
  { key: "bed", test: /\b(king|twin|single|double)\b|\bbeds?\b|bedding/i },
  { key: "location", test: /tha\s*ph?ae|walking street|old city|gate/i },
  { key: "quiet", test: /quiet|blackout|curtains/i },
  { key: "fridge", test: /refrigerator|fridge/i },
  { key: "desk", test: /\bdesk\b|\bwork\b/i },
  { key: "size", test: /\b\d+\s*sqm\b|largest room|more space/i },
];

/** Split host copy on sentence boundaries; keep a single block if none. */
export function splitRoomSummarySentences(summary: string): string[] {
  const trimmed = summary.trim();
  if (!trimmed) {
    return [];
  }

  const parts = trimmed.split(/(?<=[.!?])\s+(?=[A-Z“"'])/);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** Icon for the earliest matching fact in the sentence. */
export function matchRoomSummaryIcon(sentence: string): RoomSummaryIconKey {
  let best: { key: RoomSummaryIconKey; index: number } | null = null;

  for (const rule of ICON_RULES) {
    const match = rule.test.exec(sentence);
    if (match && (best === null || match.index < best.index)) {
      best = { key: rule.key, index: match.index };
    }
  }

  return best?.key ?? "room";
}

export type RoomSummaryLine = {
  text: string;
  icon: RoomSummaryIconKey;
};

export function buildRoomSummaryLines(summary: string): RoomSummaryLine[] {
  return splitRoomSummarySentences(summary).map((text) => ({
    text,
    icon: matchRoomSummaryIcon(text),
  }));
}
