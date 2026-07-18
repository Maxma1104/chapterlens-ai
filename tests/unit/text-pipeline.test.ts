import { describe, expect, it } from "vitest";
import { segmentManuscript } from "@/lib/analysis/text-pipeline";

describe("manuscript segmentation", () => {
  it("creates bounded chunks whose offsets reproduce exact source spans", () => {
    const source = Array.from({ length: 12 }, (_, index) =>
      `Paragraph ${index + 1}. Mara records event ${index + 1} in the archive ledger.`,
    ).join("\n\n");

    const chunks = segmentManuscript(source, { maxCharacters: 180, overlapCharacters: 30 });

    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(180);
      expect(source.slice(chunk.start, chunk.end)).toBe(chunk.text);
    }
    expect(chunks[0].start).toBe(0);
    expect(chunks.at(-1)?.end).toBe(source.length);
  });
});
