import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { analyzeManuscript } from "../lib/analysis/service";
import { validateAndGroundReport } from "../lib/analysis/evidence";
import type { AnalysisDraft, AnalysisReport } from "../lib/analysis/schema";
import { evaluationCases } from "./dataset";

type CaseResult = {
  id: string;
  category: string;
  citationAccuracy: number;
  characterRecall?: number;
  issueCorrect?: boolean;
  refusalCorrect?: boolean;
  latencyMs: number;
  costUsd: number;
};

async function run() {
  const results: CaseResult[] = [];
  for (const testCase of evaluationCases) {
    const started = performance.now();
    const report = testCase.category === "refusal"
      ? runRefusalProbe(testCase.text, testCase.title)
      : await analyzeManuscript({ text: testCase.text, title: testCase.title });
    const exactCitations = report.evidence.filter((item) => testCase.text.slice(item.start, item.end) === item.quote).length;
    const foundNames = new Set(report.characters.map((item) => item.name));
    const expectedNames = testCase.expectedCharacters ?? [];

    results.push({
      id: testCase.id,
      category: testCase.category,
      citationAccuracy: report.evidence.length ? exactCitations / report.evidence.length : 1,
      characterRecall: expectedNames.length ? expectedNames.filter((name) => foundNames.has(name)).length / expectedNames.length : undefined,
      issueCorrect: testCase.expectIssue === undefined ? undefined : (report.contradictions.length + report.consistencyIssues.length > 0) === testCase.expectIssue,
      refusalCorrect: testCase.expectRefusal === undefined ? undefined : Boolean(report.refusal) === testCase.expectRefusal,
      latencyMs: Math.round(performance.now() - started),
      costUsd: report.meta.estimatedCostUsd ?? 0,
    });
  }

  const metrics = {
    cases: results.length,
    citationAccuracy: average(results.map((item) => item.citationAccuracy)),
    characterRecall: average(results.flatMap((item) => item.characterRecall === undefined ? [] : [item.characterRecall])),
    issueDetectionAccuracy: average(results.flatMap((item) => item.issueCorrect === undefined ? [] : [item.issueCorrect ? 1 : 0])),
    refusalAccuracy: average(results.flatMap((item) => item.refusalCorrect === undefined ? [] : [item.refusalCorrect ? 1 : 0])),
    hallucinationRate: 1 - average(results.map((item) => item.citationAccuracy)),
    averageLatencyMs: average(results.map((item) => item.latencyMs)),
    totalEstimatedCostUsd: results.reduce((sum, item) => sum + item.costUsd, 0),
    provider: process.env.OPENAI_API_KEY ? "openai" : "deterministic-demo",
    generatedAt: new Date().toISOString(),
  };

  await mkdir("evaluations/results", { recursive: true });
  await writeFile("evaluations/results/latest.json", JSON.stringify({ metrics, results }, null, 2));
  await writeFile("evaluations/results/REPORT.md", markdown(metrics));
  console.log(metrics);
}

function runRefusalProbe(text: string, title: string): AnalysisReport {
  const draft: AnalysisDraft = {
    title,
    language: "English",
    summary: { text: "Rhea was secretly married in Lisbon.", evidenceIds: ["missing"] },
    evidence: [{ id: "missing", quote: "Rhea married Tomas in Lisbon.", start: 0, end: 29, confidence: 0.4 }],
    characters: [], relationships: [], timeline: [], contradictions: [], consistencyIssues: [],
    pacing: { score: 50, verdict: "Unknown", sections: [] }, suggestions: [],
  };
  return validateAndGroundReport(text, draft, { provider: "evaluation", model: "unsupported-claim-probe", durationMs: 0 });
}

function average(values: number[]): number {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
}

function markdown(metrics: Record<string, string | number>) {
  return `# ChapterLens evaluation report\n\nGenerated: ${metrics.generatedAt}\n\n| Metric | Result |\n| --- | ---: |\n| Cases | ${metrics.cases} |\n| Citation accuracy | ${(Number(metrics.citationAccuracy) * 100).toFixed(1)}% |\n| Character recall | ${(Number(metrics.characterRecall) * 100).toFixed(1)}% |\n| Contradiction classification accuracy | ${(Number(metrics.issueDetectionAccuracy) * 100).toFixed(1)}% |\n| Refusal accuracy | ${(Number(metrics.refusalAccuracy) * 100).toFixed(1)}% |\n| Hallucinated citation rate | ${(Number(metrics.hallucinationRate) * 100).toFixed(1)}% |\n| Average latency | ${metrics.averageLatencyMs} ms |\n| Estimated total cost | $${Number(metrics.totalEstimatedCostUsd).toFixed(4)} |\n| Provider | ${metrics.provider} |\n\n> Results are provider-specific. The committed baseline uses the deterministic demo engine; run with an OpenAI key before quoting model-quality metrics externally.\n`;
}

void run();
