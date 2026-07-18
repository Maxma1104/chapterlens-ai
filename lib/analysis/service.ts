import { analysisCacheKey, getCachedAnalysis, setCachedAnalysis } from "./cache";
import { analyzeWithDemoEngine } from "./demo-engine";
import { analyzeWithOpenAI } from "./openai-engine";
import type { AnalysisInput, AnalysisReport } from "./schema";
import { resolvedOpenAIModel } from "@/lib/product-policy";
import type { StageReporter } from "./stages";

export async function analyzeManuscript(
  input: AnalysisInput,
  reportStage?: StageReporter,
  allowPaidProvider = true,
): Promise<AnalysisReport> {
  await reportStage?.("cleaning");
  const useOpenAI = allowPaidProvider && Boolean(process.env.OPENAI_API_KEY);
  const model = useOpenAI ? resolvedOpenAIModel() : "demo-v1";
  const cacheKey = analysisCacheKey(input.text, input.title, model);
  const cached = getCachedAnalysis(cacheKey);
  if (cached) {
    await reportStage?.("validating");
    return cached;
  }

  const report = useOpenAI
    ? await analyzeWithOpenAI(input.text, input.title, reportStage)
    : await analyzeWithDemoEngine(input.text, input.title, reportStage);
  setCachedAnalysis(cacheKey, report);
  return report;
}
