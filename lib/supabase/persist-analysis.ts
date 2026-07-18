import type { AnalysisReport } from "@/lib/analysis/schema";
import { createSupabaseServerClient } from "./server";

export async function persistAnalysisForSignedInUser(
  report: AnalysisReport,
  sourceText: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return;
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return;

  const { error } = await supabase.from("analyses").upsert({
    id: report.id,
    user_id: userId,
    title: report.title,
    source_text: sourceText,
    report,
    word_count: report.wordCount,
    confidence: report.overallConfidence,
    provider: report.meta.provider,
    model: report.meta.model,
    input_tokens: report.meta.inputTokens ?? null,
    output_tokens: report.meta.outputTokens ?? null,
    estimated_cost_usd: report.meta.estimatedCostUsd ?? null,
    duration_ms: report.meta.durationMs,
    status: "completed",
  });
  if (error) console.error("analysis_persist_failed", { code: error.code });
}
