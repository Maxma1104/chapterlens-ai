import { describe, expect, it } from "vitest";
import { analysisInputSchema } from "@/lib/analysis/schema";

describe("analysis input policy", () => {
  it("accepts a chapter inside the published text limit", () => {
    const result = analysisInputSchema.safeParse({
      title: "Chapter 7",
      text: "A".repeat(500),
    });

    expect(result.success).toBe(true);
  });

  it("rejects text that is too short or exceeds 50,000 characters", () => {
    expect(analysisInputSchema.safeParse({ text: "Too short" }).success).toBe(false);
    expect(
      analysisInputSchema.safeParse({ text: "A".repeat(50_001) }).success,
    ).toBe(false);
  });
});
