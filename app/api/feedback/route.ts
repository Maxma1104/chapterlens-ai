import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAuthContext } from "@/lib/supabase/auth-context";

const feedbackSchema = z.object({
  analysisId: z.string().uuid(),
  helpful: z.boolean(),
  comment: z.string().trim().max(1_000).optional(),
});

export async function POST(request: NextRequest) {
  const result = feedbackSchema.safeParse(await request.json());
  if (!result.success) return NextResponse.json({ error: "Invalid feedback." }, { status: 400 });
  const { supabase, userId } = await getSupabaseAuthContext();
  if (!supabase) {
    return NextResponse.json(
      { error: "Feedback storage is not configured for this deployment." },
      { status: 503 },
    );
  }
  if (!userId) return NextResponse.json({ error: "Sign in to save feedback." }, { status: 401 });
  const { error } = await supabase.from("feedback").insert({
    analysis_id: result.data.analysisId,
    user_id: userId,
    helpful: result.data.helpful,
    comment: result.data.comment ?? null,
  });
  if (error) return NextResponse.json({ error: "Feedback could not be saved." }, { status: 500 });
  return NextResponse.json({ accepted: true, persisted: true });
}
