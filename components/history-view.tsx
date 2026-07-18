"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Clock3, Sparkles, Trash2 } from "lucide-react";
import { Brand } from "./brand";
import { ReportView } from "./analyzer/report-view";
import type { AnalysisReport } from "@/lib/analysis/schema";

type HistoryEntry = { report: AnalysisReport; source: string; createdAt: string };

export function HistoryView() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let localEntries: HistoryEntry[] = [];
      try { localEntries = JSON.parse(localStorage.getItem("chapterlens-history") ?? "[]"); } catch { localEntries = []; }
      setEntries(localEntries);
      fetch("/api/history")
        .then((response) => response.json())
        .then((payload: { entries?: HistoryEntry[] }) => {
          if (payload.entries?.length) {
            setEntries((current) => [...payload.entries!, ...current].filter((entry, index, all) => all.findIndex((candidate) => candidate.report.id === entry.report.id) === index));
          }
        })
        .catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function clear() {
    localStorage.removeItem("chapterlens-history");
    setEntries([]);
  }

  if (selected) return <main className="history-detail"><header className="desk-header"><Brand /><div className="desk-title"><span>Saved review</span></div><button onClick={() => setSelected(null)}><ArrowLeft size={15} /> Back to history</button></header><ReportView report={selected.report} source={selected.source} onReset={() => setSelected(null)} /></main>;

  return <main className="history-shell">
    <header className="desk-header"><Brand /><div className="desk-title"><span>Analysis history</span></div><nav><Link href="/analyze"><Sparkles size={15} /> New analysis</Link><Link href="/"><ArrowLeft size={15} /> Project page</Link></nav></header>
    <section className="history-content">
      <div className="history-heading"><div><span className="step-tag">YOUR LIBRARY</span><h1>Past manuscript reviews</h1><p>Local demo history keeps your ten most recent reports in this browser. Signed-in production history is isolated in Supabase.</p></div>{entries.length > 0 && <button onClick={clear}><Trash2 size={14} /> Clear local history</button>}</div>
      {entries.length === 0 ? <div className="history-empty"><div><BookOpen size={27} /></div><h2>No reviews yet.</h2><p>Analyze a chapter and its evidence map will appear here.</p><Link className="button button-primary" href="/analyze">Open the review desk</Link></div> : <div className="history-grid">{entries.map((entry) => <button key={`${entry.report.id}-${entry.createdAt}`} onClick={() => setSelected(entry)}><div><span>{entry.report.language}</span><small><Clock3 size={11} /> {new Date(entry.createdAt).toLocaleDateString()}</small></div><h2>{entry.report.title}</h2><p>{entry.report.summary.text}</p><footer><span>{entry.report.wordCount} words</span><span>{entry.report.characters.length} characters</span><b>{Math.round(entry.report.overallConfidence * 100)}% grounded</b></footer></button>)}</div>}
    </section>
  </main>;
}
