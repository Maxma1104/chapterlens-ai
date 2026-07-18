import { createSupabaseServerClient } from "./server";

export async function getSupabaseAuthContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, userId: null };
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}
