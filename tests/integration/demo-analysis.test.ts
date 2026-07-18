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

  it("handles recurring characters first introduced after the evidence preview", async () => {
    const laterCharacterManuscript = [
      "John waits by the window.",
      "It is quiet.",
      "It remains quiet.",
      "It grows darker.",
      "It starts to rain.",
      "It becomes cold.",
      "It feels late.",
      "It is nearly midnight.",
      "Jennie arrives. Jennie smiles. Jennie waits beside the door.",
    ].join("\n\n");

    const report = await analyzeWithDemoEngine(laterCharacterManuscript, "Late Arrival");

    expect(report.characters.map((character) => character.name)).toContain("Jennie");
    expect(report.characters.every((character) => character.evidenceIds.length > 0)).toBe(true);
  });
});
