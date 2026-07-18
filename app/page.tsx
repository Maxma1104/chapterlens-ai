import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  FileSearch,
  Gauge,
  GitBranch,
  Quote,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Users,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const capabilities = [
  {
    icon: FileSearch,
    number: "01",
    title: "Structural reading",
    description: "Summaries, scene beats, timelines, characters, and relationships—assembled before critique begins.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Evidence before opinion",
    description: "Every claim carries an exact quotation. Unsupported conclusions are removed, not softened into guesses.",
  },
  {
    icon: Gauge,
    number: "03",
    title: "Editorial diagnostics",
    description: "Contradictions, character consistency, pacing, and prioritized revision actions in one review pass.",
  },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero-shell page-shell">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Evidence-grounded manuscript intelligence</div>
          <h1>See the story.<br /><em>Find the fracture.</em></h1>
          <p className="hero-lede">
            ChapterLens turns a manuscript excerpt into a traceable editorial review—so every insight can be checked against the words that earned it.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/analyze">
              Analyze a chapter <ArrowRight size={17} />
            </Link>
            <a className="button button-secondary" href="#method">
              See how it works
            </a>
          </div>
          <div className="trust-row">
            <span><Check size={14} /> Exact source citations</span>
            <span><Check size={14} /> Low-confidence refusal</span>
            <span><Check size={14} /> Your text is never public</span>
          </div>
        </div>

        <div className="report-preview" aria-label="Example ChapterLens report">
          <div className="preview-topbar">
            <div><span className="preview-mark">CL</span><strong>Review / 07</strong></div>
            <span className="confidence-pill"><i /> 92% evidence matched</span>
          </div>
          <div className="preview-heading">
            <span>MANUSCRIPT REVIEW</span>
            <h2>The Archive Key</h2>
            <p>111 words · 3 characters · 4 scene beats</p>
          </div>
          <div className="preview-summary">
            <span className="preview-label">EXECUTIVE SUMMARY</span>
            <p>
              Mara secures a locked archive before Jonah emerges with the missing ledger, exposing a gap between the scene&apos;s physical rules and its outcome.<sup>1</sup>
            </p>
          </div>
          <div className="preview-grid">
            <div className="preview-card alert-card">
              <span><TimerReset size={15} /> Continuity signal</span>
              <strong>Conflicting time cues</strong>
              <p>The clock and watch disagree by twenty-five minutes.</p>
              <small><Quote size={11} /> Evidence 04</small>
            </div>
            <div className="preview-card">
              <span><Users size={15} /> Character map</span>
              <div className="character-mini">
                <i>M</i><b>—</b><i>J</i><b>—</b><i>V</i>
              </div>
              <p>One concealed promise connects all three scene participants.</p>
            </div>
          </div>
          <div className="source-strip">
            <span>1</span>
            <p>“At 8:10 p.m., Mara locked the archive door and slipped the only brass key into her coat pocket.”</p>
          </div>
        </div>
      </section>

      <section className="proof-band">
        <div className="page-shell proof-inner">
          <span>Built for careful readers</span>
          <div><Sparkles size={16} /> Writers</div>
          <div><Users size={16} /> Developmental editors</div>
          <div><GitBranch size={16} /> Publishing teams</div>
          <div><Braces size={16} /> AI quality reviewers</div>
        </div>
      </section>

      <section className="method-section page-shell" id="method">
        <div className="section-intro">
          <div className="eyebrow"><span /> The method</div>
          <h2>Analysis you can<br /><em>interrogate.</em></h2>
          <p>ChapterLens separates extraction, reasoning, and validation. That makes the output more useful—and makes failure visible.</p>
        </div>
        <div className="capability-list">
          {capabilities.map(({ icon: Icon, number, title, description }) => (
            <article key={title}>
              <span className="cap-number">{number}</span>
              <div className="cap-icon"><Icon size={21} /></div>
              <div><h3>{title}</h3><p>{description}</p></div>
              <ArrowRight size={18} />
            </article>
          ))}
        </div>
      </section>

      <section className="principle-section">
        <div className="page-shell principle-grid">
          <div>
            <span className="giant-quote">“</span>
            <blockquote>A useful AI review should show its work—and know when the work is not enough.</blockquote>
          </div>
          <div className="principle-points">
            <div><strong>01</strong><p><b>Ground first.</b><br />Build claims from exact source spans.</p></div>
            <div><strong>02</strong><p><b>Validate second.</b><br />Discard citations the source cannot verify.</p></div>
            <div><strong>03</strong><p><b>Refuse clearly.</b><br />Say when the passage cannot support an answer.</p></div>
          </div>
        </div>
      </section>

      <section className="final-cta page-shell">
        <div><span>YOUR NEXT REVISION STARTS HERE</span><h2>Bring one chapter.<br />Leave with a clearer story.</h2></div>
        <Link className="button button-light" href="/analyze">Open the review desk <ArrowRight size={17} /></Link>
      </section>
    </main>
  );
}
