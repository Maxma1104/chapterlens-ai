"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  History,
  LoaderCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { DEMO_TEXT, DEMO_TITLE } from "@/lib/demo-text";
import type { AnalysisReport } from "@/lib/analysis/schema";
import { ReportView } from "./report-view";

const stages = [
  "Cleaning and segmenting text",
  "Extracting characters and events",
  "Building the evidence index",
  "Running editorial diagnostics",
  "Validating every citation",
];

type ApiResponse = {
  report?: AnalysisReport;
  usage?: { remaining: number; resetAt: string };
  error?: { code: string; message: string };
};

export function AnalyzerWorkspace() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "complete" | "error">("idle");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "analyzing") return;
    const timer = window.setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), 900);
    return () => window.clearInterval(timer);
  }, [status]);

  async function analyze() {
    setError("");
    if (text.trim().length < 120) {
      setError("Add at least 120 characters so ChapterLens has enough evidence to analyze.");
      setStatus("error");
      return;
    }
    if (text.length > 50_000) {
      setError("This MVP accepts up to 50,000 characters per analysis.");
      setStatus("error");
      return;
    }

    setStatus("analyzing");
    setStage(0);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title: title || "Untitled chapter" }),
      });
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok || !payload.report) throw new Error(payload.error?.message ?? "Analysis failed.");
      setReport(payload.report);
      setRemaining(payload.usage?.remaining ?? null);
      setStage(stages.length - 1);
      setStatus("complete");
      saveHistory(payload.report, text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Analysis failed. Please try again.");
      setStatus("error");
    }
  }

  async function handleFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setError("The MVP accepts plain-text (.txt) files. PDF and DOCX support is planned next.");
      setStatus("error");
      return;
    }
    const content = await file.text();
    setText(content);
    if (!title) setTitle(file.name.replace(/\.txt$/i, ""));
    setStatus("idle");
    setError("");
  }

  function loadDemo() {
    setTitle(DEMO_TITLE);
    setText(DEMO_TEXT);
    setReport(null);
    setStatus("idle");
    setError("");
  }

  function reset() {
    setReport(null);
    setStatus("idle");
    setStage(0);
  }

  return (
    <main className="desk-shell">
      <header className="desk-header">
        <Brand />
        <div className="desk-title"><span>Review desk</span><i /> <small>{status === "complete" ? "Analysis ready" : "New analysis"}</small></div>
        <nav><Link href="/history"><History size={16} /> History</Link><Link href="/"><ArrowLeft size={16} /> Project page</Link></nav>
      </header>

      <div className={`workspace-grid ${report ? "has-report" : ""}`}>
        <section className="manuscript-panel">
          <div className="panel-heading">
            <div><span className="step-tag">01 / SOURCE</span><h1>Your manuscript</h1></div>
            <button className="text-button" onClick={loadDemo}>Load example</button>
          </div>
          <label className="title-field">
            <span>Chapter title <small>optional</small></span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 7 — The Crossing" maxLength={120} />
          </label>
          <div className="editor-wrap">
            <textarea
              value={text}
              onChange={(event) => { setText(event.target.value); setError(""); if (status === "error") setStatus("idle"); }}
              placeholder="Paste a chapter or long excerpt here…"
              aria-label="Manuscript text"
            />
            <div className="editor-footer">
              <button onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload .txt</button>
              <input ref={fileRef} type="file" accept=".txt,text/plain" hidden onChange={(event) => handleFile(event.target.files?.[0])} />
              <span className={text.length > 50_000 ? "over-limit" : ""}>{text.length.toLocaleString()} / 50,000 characters</span>
            </div>
          </div>

          {error && <div className="inline-error"><AlertCircle size={17} /><span>{error}</span><button onClick={analyze}>Retry</button></div>}

          <div className="privacy-note">
            <ShieldMini />
            <span><strong>Private by design.</strong> Text is sent only to the configured analysis provider and is never used as public content.</span>
          </div>
          <button className="analyze-button" disabled={status === "analyzing" || text.trim().length < 120} onClick={analyze}>
            {status === "analyzing" ? <><LoaderCircle className="spin" size={18} /> Analyzing manuscript…</> : <><Sparkles size={17} /> Run evidence-grounded review</>}
          </button>
          {remaining !== null && <p className="usage-note">{remaining} free {remaining === 1 ? "analysis" : "analyses"} remaining today.</p>}
        </section>

        <section className="analysis-panel">
          {status === "analyzing" ? (
            <ProgressView activeStage={stage} />
          ) : report ? (
            <ReportView report={report} source={text} onReset={reset} />
          ) : (
            <EmptyAnalysis />
          )}
        </section>
      </div>
    </main>
  );
}

function saveHistory(report: AnalysisReport, source: string) {
  try {
    const current = JSON.parse(localStorage.getItem("chapterlens-history") ?? "[]") as unknown[];
    localStorage.setItem("chapterlens-history", JSON.stringify([{ report, source, createdAt: new Date().toISOString() }, ...current].slice(0, 10)));
  } catch {
    // A full storage quota must never make a successful analysis look failed.
  }
}

function EmptyAnalysis() {
  return <div className="empty-analysis">
    <div className="empty-orbit"><FileText size={31} /><i /><i /></div>
    <span className="step-tag">02 / ANALYSIS</span>
    <h2>Your editorial map<br />will appear here.</h2>
    <p>ChapterLens extracts structure first, then tests editorial claims against exact source evidence.</p>
    <div className="empty-metrics"><span>Summary</span><span>Characters</span><span>Timeline</span><span>Continuity</span><span>Pacing</span><span>Suggestions</span></div>
  </div>;
}

function ProgressView({ activeStage }: { activeStage: number }) {
  return <div className="progress-view">
    <div className="scan-icon"><Sparkles size={26} /><span /></div>
    <span className="step-tag">ANALYSIS IN PROGRESS</span>
    <h2>Reading like an editor.<br /><em>Checking like an auditor.</em></h2>
    <div className="stage-list">{stages.map((item, index) => <div key={item} className={index < activeStage ? "done" : index === activeStage ? "active" : ""}><i>{index < activeStage ? "✓" : index + 1}</i><span>{item}</span>{index === activeStage && <LoaderCircle className="spin" size={15} />}</div>)}</div>
    <p>Longer chapters can take up to a minute. Keep this tab open.</p>
  </div>;
}

function ShieldMini() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5-3.4 9-8 11-4.6-2-8-6-8-11V5l8-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
}
