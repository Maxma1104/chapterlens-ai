import type { AnalysisReport } from "@/lib/analysis/schema";
import { segmentManuscript } from "@/lib/analysis/text-pipeline";
import { getSupabaseAuthContext } from "./auth-context";

export async function persistAnalysisForSignedInUser(
  report: AnalysisReport,
  sourceText: string,
): Promise<void> {
  const { supabase, userId } = await getSupabaseAuthContext();
  if (!supabase || !userId) return;

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
  if (error) {
    console.error("analysis_persist_failed", { code: error.code });
    return;
  }

  const chunks = segmentManuscript(sourceText);
  const [chunkResult, storageResult] = await Promise.all([
    supabase.from("document_chunks").upsert(
      chunks.map((chunk) => ({
        analysis_id: report.id,
        user_id: userId,
        chunk_index: chunk.index,
        content: chunk.text,
        start_offset: chunk.start,
        end_offset: chunk.end,
      })),
      { onConflict: "analysis_id,chunk_index" },
    ),
    supabase.storage
      .from("manuscripts")
      .upload(`${userId}/${report.id}.txt`, new Blob([sourceText], { type: "text/plain" }), {
        contentType: "text/plain",
        upsert: true,
      }),
  ]);
  if (chunkResult.error) {
    console.error("analysis_chunks_persist_failed", { code: chunkResult.error.code });
  }
  if (storageResult.error) {
    console.error("manuscript_storage_failed", { message: storageResult.error.message });
  }
}
