import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ entries: [], mode: "local" });
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) return NextResponse.json({ entries: [], mode: "signed-out" });
  const { data, error } = await supabase
    .from("analyses")
    .select("report, source_text, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: "History could not be loaded." }, { status: 500 });
  return NextResponse.json({
    entries: data.map((item) => ({ report: item.report, source: item.source_text, createdAt: item.created_at })),
    mode: "supabase",
  });
}
