import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { analyzeManuscript } from "../lib/analysis/service";
import { validateAndGroundReport } from "../lib/analysis/evidence";
import type { AnalysisDraft, AnalysisReport } from "../lib/analysis/schema";
import { applyClaimVerification } from "../lib/analysis/verification";
import { evaluationCases } from "./dataset";

type CaseResult = {
  id: string;
  category: string;
  exactCitationRate: number;
  characterRecall?: number;
  summaryTermRecall?: number;
  issueCorrect?: boolean;
  failClosedPolicyCorrect?: boolean;
  promptInjectionResisted?: boolean;
  latencyMs: number;
  costUsd: number;
  error?: string;
};

async function run() {
  const results: CaseResult[] = [];
  for (const testCase of evaluationCases) {
    const started = performance.now();
    try {
      const report = testCase.category === "refusal"
        ? runRefusalProbe(testCase.text, testCase.title)
        : await analyzeManuscript({ text: testCase.text, title: testCase.title });
      const exactCitations = report.evidence.filter((item) => testCase.text.slice(item.start, item.end) === item.quote).length;
      const foundNames = new Set(report.characters.map((item) => item.name));
      const expectedNames = testCase.expectedCharacters ?? [];
      const expectedTerms = testCase.expectedSummaryTerms ?? [];
      const normalizedSummary = report.summary.text.toLocaleLowerCase();
      const normalizedClaims = reportClaimText(report).toLocaleLowerCase();

      results.push({
        id: testCase.id,
        category: testCase.category,
        exactCitationRate: report.evidence.length ? exactCitations / report.evidence.length : 1,
        characterRecall: expectedNames.length ? expectedNames.filter((name) => foundNames.has(name)).length / expectedNames.length : undefined,
        summaryTermRecall: expectedTerms.length ? expectedTerms.filter((term) => normalizedSummary.includes(term.toLocaleLowerCase())).length / expectedTerms.length : undefined,
        issueCorrect: testCase.expectIssue === undefined ? undefined : (report.contradictions.length + report.consistencyIssues.length > 0) === testCase.expectIssue,
        failClosedPolicyCorrect: testCase.expectRefusal === undefined ? undefined : Boolean(report.refusal) === testCase.expectRefusal,
        promptInjectionResisted: testCase.expectedForbiddenClaims?.length
          ? testCase.expectedForbiddenClaims.every((claim) => !normalizedClaims.includes(claim.toLocaleLowerCase()))
          : undefined,
        latencyMs: Math.round(performance.now() - started),
        costUsd: report.meta.estimatedCostUsd ?? 0,
      });
    } catch (error) {
      results.push({
        id: testCase.id,
        category: testCase.category,
        exactCitationRate: 0,
        latencyMs: Math.round(performance.now() - started),
        costUsd: 0,
        error: error instanceof Error ? error.message : "Unknown evaluation error",
      });
    }
  }

  const metrics = {
    cases: results.length,
    exactCitationRate: average(results.map((item) => item.exactCitationRate)),
    characterRecall: average(results.flatMap((item) => item.characterRecall === undefined ? [] : [item.characterRecall])),
    summaryTermRecall: average(results.flatMap((item) => item.summaryTermRecall === undefined ? [] : [item.summaryTermRecall])),
    contradictionClassificationAccuracy: average(results.flatMap((item) => item.issueCorrect === undefined ? [] : [item.issueCorrect ? 1 : 0])),
    failClosedPolicyPassRate: average(results.flatMap((item) => item.failClosedPolicyCorrect === undefined ? [] : [item.failClosedPolicyCorrect ? 1 : 0])),
    promptInjectionResistanceRate: average(results.flatMap((item) => item.promptInjectionResisted === undefined ? [] : [item.promptInjectionResisted ? 1 : 0])),
    modelClaimSupportAccuracy: null,
    modelHallucinationRate: null,
    exactCitationMismatchRate: 1 - average(results.map((item) => item.exactCitationRate)),
    errorRate: average(results.map((item) => item.error ? 1 : 0)),
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
    summary: { text: "Rhea was secretly married in Lisbon.", evidenceIds: ["present-but-irrelevant"] },
    evidence: [{ id: "present-but-irrelevant", quote: "Rhea places a numbered card on the table", start: 0, end: 42, confidence: 0.9 }],
    characters: [], relationships: [], timeline: [], contradictions: [], consistencyIssues: [],
    pacing: { score: 50, verdict: "Unknown", evidenceIds: ["present-but-irrelevant"], sections: [] }, suggestions: [],
  };
  const exactReport = validateAndGroundReport(text, draft, {
    provider: "evaluation",
    model: "support-validator-probe",
    durationMs: 0,
  });
  return applyClaimVerification(exactReport, [
    {
      claimId: "summary",
      supported: false,
      confidence: 0.99,
      rationale: "The exact quotation does not support the marriage claim.",
    },
  ]);
}

function average(values: number[]): number {
  return values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)) : 0;
}

function markdown(metrics: Record<string, string | number | null>) {
  return `# ChapterLens evaluation report\n\nGenerated: ${metrics.generatedAt}\n\n| Metric | Result |\n| --- | ---: |\n| Cases | ${metrics.cases} |\n| Exact citation rate | ${(Number(metrics.exactCitationRate) * 100).toFixed(1)}% |\n| Character recall | ${(Number(metrics.characterRecall) * 100).toFixed(1)}% |\n| Summary term recall | ${(Number(metrics.summaryTermRecall) * 100).toFixed(1)}% |\n| Contradiction classification accuracy | ${(Number(metrics.contradictionClassificationAccuracy) * 100).toFixed(1)}% |\n| Fail-closed policy pass rate | ${(Number(metrics.failClosedPolicyPassRate) * 100).toFixed(1)}% |\n| Prompt-injection resistance rate | ${(Number(metrics.promptInjectionResistanceRate) * 100).toFixed(1)}% |\n| Model claim-support accuracy | Not run |\n| Model hallucination rate | Not run |\n| Exact citation mismatch rate | ${(Number(metrics.exactCitationMismatchRate) * 100).toFixed(1)}% |\n| Error rate | ${(Number(metrics.errorRate) * 100).toFixed(1)}% |\n| Average latency | ${metrics.averageLatencyMs} ms |\n| Estimated total cost | $${Number(metrics.totalEstimatedCostUsd).toFixed(4)} |\n| Provider | ${metrics.provider} |\n\n> Metric boundaries matter: exact citation rate proves quotation presence, not claim support. The fail-closed score tests deterministic policy application after an unsupported verifier decision; it does not measure verifier intelligence. Model claim-support and hallucination rates remain unreported until an independent judged OpenAI baseline is run.\n`;
}

function reportClaimText(report: AnalysisReport): string {
  return [
    report.summary.text,
    ...report.characters.map((item) => item.description),
    ...report.relationships.map((item) => item.detail),
    ...report.timeline.map((item) => item.description),
    ...report.contradictions.flatMap((item) => [item.title, item.detail]),
    ...report.consistencyIssues.flatMap((item) => [item.title, item.detail]),
    report.pacing.verdict,
    ...report.pacing.sections.map((item) => item.note),
    ...report.suggestions.flatMap((item) => [item.rationale, item.action]),
  ].join(" ");
}

void run();
