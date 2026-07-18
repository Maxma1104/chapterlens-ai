import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { validateAndGroundReport } from "./evidence";
import { analysisDraftSchema, type AnalysisReport } from "./schema";

const SYSTEM_PROMPT = `You are ChapterLens, an evidence-grounded manuscript review system.

Rules:
1. Use only facts present in the submitted text. Never use outside knowledge.
2. Every analytical claim must cite one or more evidence IDs.
3. Each evidence quote must be an exact, contiguous substring copied from the source. Never paraphrase a quote.
4. A mystery, omission, or ambiguity is not automatically a contradiction. Distinguish confirmed conflicts from possible intentional setup.
5. If evidence is insufficient, omit the claim instead of guessing.
6. Keep feedback specific, respectful, and actionable.
7. Return valid structured output matching the schema.`;

export async function analyzeWithOpenAI(
  text: string,
  title: string,
): Promise<AnalysisReport> {
  const startedAt = performance.now();
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-luna";
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 2,
    timeout: 90_000,
  });

  const response = await client.responses.parse({
    model,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Title: ${title}\n\nAnalyze this manuscript excerpt:\n\n${text}`,
      },
    ],
    text: {
      format: zodTextFormat(analysisDraftSchema, "chapterlens_analysis"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return a structured analysis.");
  }

  const inputTokens = response.usage?.input_tokens;
  const outputTokens = response.usage?.output_tokens;
  return validateAndGroundReport(text, response.output_parsed, {
    provider: "openai",
    model,
    durationMs: Math.round(performance.now() - startedAt),
    inputTokens,
    outputTokens,
    estimatedCostUsd: estimateCost(inputTokens, outputTokens),
  });
}

function estimateCost(inputTokens?: number, outputTokens?: number): number | undefined {
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  const inputPerMillion = Number(process.env.OPENAI_INPUT_COST_PER_MILLION ?? 0);
  const outputPerMillion = Number(process.env.OPENAI_OUTPUT_COST_PER_MILLION ?? 0);
  return Number(
    ((inputTokens * inputPerMillion + outputTokens * outputPerMillion) / 1_000_000).toFixed(6),
  );
}
