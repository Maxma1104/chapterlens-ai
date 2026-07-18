import { describe, expect, it } from "vitest";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/analysis/cache";
import { analyzeWithDemoEngine } from "@/lib/analysis/demo-engine";
import { sampleManuscript } from "@/tests/fixtures/manuscript";

describe("analysis cache", () => {
  it("reuses grounded content without reusing a user-owned analysis id", async () => {
    const report = await analyzeWithDemoEngine(sampleManuscript, "Cache boundary");
    setCachedAnalysis("shared-content", report);

    const cached = getCachedAnalysis("shared-content");

    expect(cached).not.toBeNull();
    expect(cached?.id).not.toBe(report.id);
    expect(cached?.summary).toEqual(report.summary);
    expect(cached?.meta.cached).toBe(true);
  });
});
