import { describe, expect, it } from "vitest";
import { analyzeWithDemoEngine } from "@/lib/analysis/demo-engine";
import { applyClaimVerification } from "@/lib/analysis/verification";
import { sampleManuscript } from "@/tests/fixtures/manuscript";

describe("claim support verification", () => {
  it("refuses an exact-quote summary when the verifier says the quote does not support it", async () => {
    const report = await analyzeWithDemoEngine(sampleManuscript, "Verifier boundary");

    const verified = applyClaimVerification(report, [
      { claimId: "summary", supported: false, confidence: 0.97, rationale: "The quote is present but does not entail the claim." },
    ]);

    expect(verified.refusal?.reason).toBe("insufficient_evidence");
    expect(verified.summary.evidenceIds).toEqual([]);
    expect(verified.overallConfidence).toBe(0);
    expect(verified.meta.verificationMode).toBe("entailment");
  });
});
