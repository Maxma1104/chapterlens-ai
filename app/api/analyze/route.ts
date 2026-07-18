import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { analyzeManuscript } from "@/lib/analysis/service";
import { analysisInputSchema } from "@/lib/analysis/schema";
import { persistAnalysisForSignedInUser } from "@/lib/supabase/persist-analysis";
import { consumeAnalysisQuota } from "@/lib/usage-policy";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const input = analysisInputSchema.parse(await request.json());
    const usage = await consumeAnalysisQuota(request);

    if (!usage.allowed) {
      const monthlyBudgetReached = usage.reason === "monthly_budget_reached";
      return NextResponse.json(
        {
          error: {
            code: monthlyBudgetReached ? "monthly_budget_reached" : "daily_limit_reached",
            message: monthlyBudgetReached
              ? "The monthly AI budget has been reached. Analysis resumes at the next monthly reset."
              : "You have used today's five analyses. Your allowance resets at 00:00 UTC.",
            resetAt: usage.resetAt,
          },
        },
        { status: 429, headers: { "Retry-After": secondsUntil(usage.resetAt).toString() } },
      );
    }

    const report = await analyzeManuscript(input);
    await persistAnalysisForSignedInUser(report, input.text);
    return NextResponse.json(
      { report, usage: { remaining: usage.remaining, resetAt: usage.resetAt } },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "X-ChapterLens-Mode": process.env.OPENAI_API_KEY ? "openai" : "demo",
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "invalid_input",
            message: error.issues[0]?.message ?? "The submitted text is invalid.",
          },
        },
        { status: 400 },
      );
    }

    console.error("analysis_failed", error);
    return NextResponse.json(
      {
        error: {
          code: "analysis_failed",
          message: "The analysis could not be completed. Your text is safe; please retry in a moment.",
        },
      },
      { status: 500 },
    );
  }
}

function secondsUntil(isoDate: string): number {
  return Math.max(1, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 1000));
}
