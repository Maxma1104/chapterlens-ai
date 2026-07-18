import { describe, expect, it } from "vitest";
import { validateAndGroundReport } from "@/lib/analysis/evidence";
import type { AnalysisDraft } from "@/lib/analysis/schema";

describe("evidence grounding", () => {
  it("keeps exact quotes, repairs offsets, and removes unsupported conclusions", () => {
    const source = "Mara locked the door. Jonah waited outside.";
    const draft: AnalysisDraft = {
      title: "Test chapter",
      language: "English",
      summary: {
        text: "Mara secures the room.",
        evidenceIds: ["e1"],
      },
      evidence: [
        { id: "e1", quote: "Mara locked the door.", start: 999, end: 1000, confidence: 0.96 },
        { id: "e2", quote: "Jonah broke the window.", start: 0, end: 24, confidence: 0.8 },
      ],
      characters: [],
      relationships: [],
      timeline: [],
      contradictions: [
        {
          id: "f1",
          title: "Unsupported break-in",
          detail: "Jonah breaks a window.",
          severity: "high",
          confidence: 0.8,
          evidenceIds: ["e2"],
        },
      ],
      consistencyIssues: [],
      pacing: { score: 72, verdict: "Steady", sections: [] },
      suggestions: [],
    };

    const report = validateAndGroundReport(source, draft, {
      provider: "test",
      model: "fixture",
      durationMs: 12,
    });

    expect(report.evidence).toHaveLength(1);
    expect(report.evidence[0]).toMatchObject({ start: 0, end: 21 });
    expect(report.contradictions).toEqual([]);
    expect(report.summary.evidenceIds).toEqual(["e1"]);
  });
});
