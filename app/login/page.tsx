import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail } from "lucide-react";
import { Brand } from "@/components/brand";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInWithEmail } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; error?: string }> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  return <main className="login-shell">
    <div className="login-brand"><Brand /><Link href="/"><ArrowLeft size={14} /> Back to project</Link></div>
    <section className="login-card">
      <div className="login-icon"><LockKeyhole size={24} /></div>
      <span className="step-tag">PRIVATE WORKSPACE</span>
      <h1>Return to your<br /><em>review desk.</em></h1>
      <p>We&apos;ll email you a secure sign-in link. No password to remember.</p>
      {params.message && <div className="login-message">{params.message}</div>}
      {params.error && <div className="login-message error">{params.error}</div>}
      <form action={signInWithEmail}>
        <label><span>Email address</span><div><Mail size={15} /><input name="email" type="email" required placeholder="editor@example.com" autoComplete="email" /></div></label>
        <button disabled={!configured}>Send secure link <ArrowRight size={16} /></button>
      </form>
      {!configured && <Link className="demo-entry" href="/analyze">Continue in local demo mode <ArrowRight size={14} /></Link>}
      <div className="login-proof"><span><Check size={12} /> Row-level data isolation</span><span><Check size={12} /> No public manuscript URLs</span></div>
    </section>
    <p className="login-foot">By continuing, you agree to use ChapterLens only with text you have permission to review.</p>
  </main>;
}
