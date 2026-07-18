import { describe, expect, it } from "vitest";
import { analyzeWithDemoEngine } from "@/lib/analysis/demo-engine";
import { sampleManuscript } from "@/tests/fixtures/manuscript";

describe("demo analysis", () => {
  it("returns a complete report whose citations all point to exact source text", async () => {
    const report = await analyzeWithDemoEngine(sampleManuscript, "The Archive Key");

    expect(report.summary.text.length).toBeGreaterThan(40);
    expect(report.characters.map((character) => character.name)).toEqual(
      expect.arrayContaining(["Mara", "Jonah", "Vale"]),
    );
    expect(report.timeline.length).toBeGreaterThanOrEqual(3);
    expect(report.contradictions.length).toBeGreaterThanOrEqual(1);
    expect(report.suggestions.length).toBeGreaterThanOrEqual(2);
    expect(report.evidence.length).toBeGreaterThanOrEqual(4);

    for (const evidence of report.evidence) {
      expect(sampleManuscript.slice(evidence.start, evidence.end)).toBe(evidence.quote);
    }
  });
});
