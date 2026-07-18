import { analysisCacheKey, getCachedAnalysis, setCachedAnalysis } from "./cache";
import { analyzeWithDemoEngine } from "./demo-engine";
import { analyzeWithOpenAI } from "./openai-engine";
import type { AnalysisInput, AnalysisReport } from "./schema";

export async function analyzeManuscript(input: AnalysisInput): Promise<AnalysisReport> {
  const useOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const model = useOpenAI ? (process.env.OPENAI_MODEL ?? "gpt-5.6-luna") : "demo-v1";
  const cacheKey = analysisCacheKey(input.text, input.title, model);
  const cached = getCachedAnalysis(cacheKey);
  if (cached) return cached;

  const report = useOpenAI
    ? await analyzeWithOpenAI(input.text, input.title)
    : await analyzeWithDemoEngine(input.text, input.title);
  setCachedAnalysis(cacheKey, report);
  return report;
}
