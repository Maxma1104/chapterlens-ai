import { after, NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { analyzeManuscript } from "@/lib/analysis/service";
import { analysisInputSchema } from "@/lib/analysis/schema";
import { persistAnalysisForSignedInUser } from "@/lib/supabase/persist-analysis";
import { consumeAnalysisQuota } from "@/lib/usage-policy";
import { DAILY_ANALYSIS_LIMIT } from "@/lib/product-policy";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const input = analysisInputSchema.parse(await request.json());
    const usage = await consumeAnalysisQuota(request);
    const allowPaidProvider = usage.reason === "allowed";

    if (!usage.allowed) {
      const monthlyBudgetReached = usage.reason === "monthly_budget_reached";
      const quotaUnavailable = usage.reason === "quota_unavailable";
      return NextResponse.json(
        {
          error: {
            code: monthlyBudgetReached
              ? "monthly_budget_reached"
              : quotaUnavailable
                ? "quota_unavailable"
                : "daily_limit_reached",
            message: quotaUnavailable
              ? "Usage protection is temporarily unavailable. Please retry in a minute."
              : monthlyBudgetReached
                ? "The monthly AI budget has been reached. Analysis resumes at the next monthly reset."
                : `You have used today's ${DAILY_ANALYSIS_LIMIT} analyses. Your allowance resets at 00:00 UTC.`,
            resetAt: usage.resetAt,
          },
        },
        { status: 429, headers: { "Retry-After": secondsUntil(usage.resetAt).toString() } },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: unknown) =>
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        try {
          const report = await analyzeManuscript(
            input,
            (stage) => send({ type: "stage", stage }),
            allowPaidProvider,
          );
          after(async () => {
            try {
              await withTimeout(
                persistAnalysisForSignedInUser(report, input.text),
                8_000,
                "Analysis persistence timed out.",
              );
            } catch (error) {
              console.error("analysis_persist_deferred_failed", error);
            }
          });
          send({
            type: "result",
            report,
            usage: { remaining: usage.remaining, resetAt: usage.resetAt },
          });
        } catch (error) {
          console.error("analysis_stream_failed", error);
          send({
            type: "error",
            error: {
              code: "analysis_failed",
              message:
                "The analysis could not be completed. Your text is safe; please retry in a moment.",
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
        "X-ChapterLens-Mode": allowPaidProvider && process.env.OPENAI_API_KEY ? "openai" : "demo",
      },
    });
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

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
