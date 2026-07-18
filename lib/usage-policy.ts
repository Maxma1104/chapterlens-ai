import type { NextRequest } from "next/server";
import { checkDailyLimit } from "./rate-limit";
import { getSupabaseAuthContext } from "./supabase/auth-context";

export async function consumeAnalysisQuota(request: NextRequest) {
  const { supabase, userId } = await getSupabaseAuthContext();
  if (supabase && userId) {
    const { data, error } = await supabase.rpc("consume_analysis_quota");
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
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      reason: "quota_unavailable",
    };
  }

  const identity = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return { ...checkDailyLimit(identity), reason: "local_daily_limit" };
}
