import {
  analysisDraftSchema,
  analysisReportSchema,
  type AnalysisDraft,
  type AnalysisMeta,
  type AnalysisReport,
  type Evidence,
} from "./schema";

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `report-${Date.now()}`;
}

function normalizeEvidence(source: string, evidence: Evidence[]): Evidence[] {
  const seen = new Set<string>();

  return evidence.flatMap((item) => {
    if (seen.has(item.id)) return [];
    const start = source.indexOf(item.quote);
    if (start < 0) return [];
    seen.add(item.id);

    return [{ ...item, start, end: start + item.quote.length }];
  });
}

function hasEvidence(ids: string[], validIds: Set<string>): boolean {
  return ids.length > 0 && ids.every((id) => validIds.has(id));
}

export function validateAndGroundReport(
  source: string,
  rawDraft: AnalysisDraft,
  meta: AnalysisMeta,
): AnalysisReport {
  const draft = analysisDraftSchema.parse(rawDraft);
  const evidence = normalizeEvidence(source, draft.evidence);
  const validIds = new Set(evidence.map((item) => item.id));
  const filterCited = <T extends { evidenceIds: string[] }>(items: T[]) =>
    items.filter((item) => hasEvidence(item.evidenceIds, validIds));

  const summaryIsGrounded = hasEvidence(draft.summary.evidenceIds, validIds);
  const pacingIsGrounded = hasEvidence(draft.pacing.evidenceIds, validIds);
  const grounded = {
    ...draft,
    evidence,
    summary: summaryIsGrounded
      ? draft.summary
      : {
          text: "ChapterLens could not produce a supported summary from the available text.",
          evidenceIds: [],
        },
    characters: filterCited(draft.characters),
    relationships: filterCited(draft.relationships),
    timeline: filterCited(draft.timeline),
    contradictions: filterCited(draft.contradictions),
    consistencyIssues: filterCited(draft.consistencyIssues),
    pacing: {
      ...draft.pacing,
      score: pacingIsGrounded ? draft.pacing.score : 0,
      verdict: pacingIsGrounded
        ? draft.pacing.verdict
        : "Evidence insufficient to assess overall pacing.",
      evidenceIds: pacingIsGrounded ? draft.pacing.evidenceIds : [],
      sections: pacingIsGrounded ? filterCited(draft.pacing.sections) : [],
    },
    suggestions: filterCited(draft.suggestions),
  };

  const confidenceValues = evidence.map((item) => item.confidence);
  const overallConfidence = confidenceValues.length
    ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
    : 0;
  const refusal = !summaryIsGrounded
    ? {
        reason: "insufficient_evidence",
        message:
          "ChapterLens could not find enough exact evidence in the uploaded text to support a reliable summary.",
      }
    : undefined;

  return analysisReportSchema.parse({
    ...grounded,
    id: makeId(),
    wordCount: source.trim() ? source.trim().split(/\s+/u).length : 0,
    overallConfidence: Number(overallConfidence.toFixed(2)),
    refusal,
    meta,
  });
}
