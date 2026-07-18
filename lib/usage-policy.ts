import type { NextRequest } from "next/server";
import { checkDailyLimit } from "./rate-limit";
import { createSupabaseServerClient } from "./supabase/server";

export async function consumeAnalysisQuota(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { data: claimsData } = await supabase.auth.getClaims();
    if (claimsData?.claims?.sub) {
      const { data, error } = await supabase.rpc("consume_analysis_quota", {
        p_daily_limit: 5,
        p_monthly_budget_usd: Number(process.env.MONTHLY_BUDGET_USD ?? 25),
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (!error && result) {
        return {
          allowed: Boolean(result.allowed),
          remaining: Number(result.remaining),
          resetAt: String(result.reset_at),
          reason: String(result.reason),
        };
      }
      console.error("quota_rpc_failed", { code: error?.code });
    }
  }

  const identity = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return { ...checkDailyLimit(identity), reason: "local_daily_limit" };
}
