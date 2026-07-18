import { analysisReportSchema, type AnalysisReport } from "./schema";

export type VerifiableClaim = {
  claimId: string;
  kind: string;
  claim: string;
  evidence: string[];
};

export type ClaimDecision = {
  claimId: string;
  supported: boolean;
  confidence: number;
  rationale: string;
};

export function collectVerifiableClaims(report: AnalysisReport): VerifiableClaim[] {
  const evidenceById = new Map(report.evidence.map((item) => [item.id, item.quote]));
  const make = (claimId: string, kind: string, claim: string, evidenceIds: string[]) => ({
    claimId,
    kind,
    claim,
    evidence: evidenceIds.flatMap((id) => evidenceById.get(id) ?? []),
  });

  return [
    make("summary", "summary", report.summary.text, report.summary.evidenceIds),
    ...report.characters.map((item) => make(`character:${item.id}`, "character", `${item.name}: ${item.description}`, item.evidenceIds)),
    ...report.relationships.map((item) => make(`relationship:${item.id}`, "relationship", `${item.source} → ${item.target}: ${item.detail}`, item.evidenceIds)),
    ...report.timeline.map((item) => make(`timeline:${item.id}`, "timeline", item.description, item.evidenceIds)),
    ...report.contradictions.map((item) => make(`contradiction:${item.id}`, "contradiction", `${item.title}: ${item.detail}`, item.evidenceIds)),
    ...report.consistencyIssues.map((item) => make(`consistency:${item.id}`, "consistency", `${item.title}: ${item.detail}`, item.evidenceIds)),
    make("pacing:overall", "pacing", `${report.pacing.score}/100: ${report.pacing.verdict}`, report.pacing.evidenceIds),
    ...report.pacing.sections.map((item) => make(`pacing:${item.id}`, "pacing", item.note, item.evidenceIds)),
    ...report.suggestions.map((item) => make(`suggestion:${item.id}`, "suggestion", `${item.rationale} Action: ${item.action}`, item.evidenceIds)),
  ];
}

export function applyClaimVerification(
  report: AnalysisReport,
  decisions: ClaimDecision[],
): AnalysisReport {
  const decisionById = new Map(decisions.map((item) => [item.claimId, item]));
  const supported = (claimId: string) => {
    const decision = decisionById.get(claimId);
    return Boolean(decision?.supported && decision.confidence >= 0.6);
  };
  const filter = <T extends { id: string }>(kind: string, items: T[]) =>
    items.filter((item) => supported(`${kind}:${item.id}`));
  const summarySupported = supported("summary");
  const supportedConfidences = decisions
    .filter((item) => item.supported && item.confidence >= 0.6)
    .map((item) => item.confidence);

  return analysisReportSchema.parse({
    ...report,
    summary: summarySupported
      ? report.summary
      : {
          text: "ChapterLens could not produce a summary whose cited evidence passed support verification.",
          evidenceIds: [],
        },
    characters: filter("character", report.characters),
    relationships: filter("relationship", report.relationships),
    timeline: filter("timeline", report.timeline),
    contradictions: filter("contradiction", report.contradictions),
    consistencyIssues: filter("consistency", report.consistencyIssues),
    pacing: supported("pacing:overall")
      ? { ...report.pacing, sections: filter("pacing", report.pacing.sections) }
      : {
          ...report.pacing,
          score: 0,
          verdict: "Evidence insufficient to assess overall pacing.",
          evidenceIds: [],
          sections: [],
        },
    suggestions: filter("suggestion", report.suggestions),
    refusal: summarySupported
      ? report.refusal
      : {
          reason: "insufficient_evidence",
          message:
            "ChapterLens found exact quotations, but they did not provide enough support for a reliable summary.",
        },
    overallConfidence: supportedConfidences.length
      ? Number(
          (
            supportedConfidences.reduce((sum, value) => sum + value, 0) /
            supportedConfidences.length
          ).toFixed(2),
        )
      : 0,
    meta: { ...report.meta, verificationMode: "entailment" },
  });
}
