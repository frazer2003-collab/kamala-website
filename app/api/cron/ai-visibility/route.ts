import { NextResponse } from "next/server";
import { runVisibilityCheck } from "@/lib/ai-visibility";
import { getPromptsDue, saveVisibilityResults } from "@/lib/ai-visibility-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs daily; four prompts per run cycles the whole list roughly weekly. */
const PROMPTS_PER_RUN = 4;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not set" }, { status: 503 });
  }

  const prompts = await getPromptsDue(PROMPTS_PER_RUN);
  const results = await Promise.all(
    prompts.map((entry) =>
      runVisibilityCheck(entry, { apiKey, model: process.env.AI_VISIBILITY_MODEL }),
    ),
  );
  await saveVisibilityResults(results);

  return NextResponse.json({
    checked: results.map((result) => ({
      prompt: result.prompt,
      mentioned: result.mentioned,
      cited: result.cited,
      error: result.error,
    })),
  });
}
