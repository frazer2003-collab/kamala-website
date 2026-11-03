/**
 * Asks every prompt in lib/ai-visibility-prompts.ts through OpenAI web search and
 * reports whether Kamala is mentioned or cited. Needs OPENAI_API_KEY; saves to
 * Supabase too when the staff Supabase env is present:
 *   vercel env run -e production -- npx tsx scripts/ai-visibility-check.ts
 */
import { AI_VISIBILITY_PROMPTS } from "@/lib/ai-visibility-prompts";
import { runVisibilityCheck, type VisibilityResult } from "@/lib/ai-visibility";
import { saveVisibilityResults } from "@/lib/ai-visibility-data";
import { hasStaffSupabaseConfig } from "@/lib/supabase";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error("Set OPENAI_API_KEY first.");
  process.exit(1);
}

async function main(key: string) {
  const results: VisibilityResult[] = [];
  for (let index = 0; index < AI_VISIBILITY_PROMPTS.length; index += 4) {
    const batch = AI_VISIBILITY_PROMPTS.slice(index, index + 4);
    results.push(
      ...(await Promise.all(
        batch.map((entry) =>
          runVisibilityCheck(entry, { apiKey: key, model: process.env.AI_VISIBILITY_MODEL }),
        ),
      )),
    );
  }

  for (const result of results) {
    const mark = result.error ? "ERR " : result.cited ? "CITED" : result.mentioned ? "NAMED" : " -  ";
    console.log(`${mark}  ${result.prompt}${result.error ? `  (${result.error})` : ""}`);
  }
  const scored = results.filter((result) => !result.error);
  const named = scored.filter((result) => result.mentioned).length;
  console.log(`\nMentioned in ${named} of ${scored.length} answers.`);

  if (hasStaffSupabaseConfig()) {
    await saveVisibilityResults(results);
    console.log("Saved to Supabase; see Staff > AI search.");
  }
}

void main(apiKey);
