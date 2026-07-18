"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Quote, RotateCcw, ThumbsDown, ThumbsUp, Users } from "lucide-react";
import type { AnalysisReport, Evidence } from "@/lib/analysis/schema";

type Tab = "overview" | "characters" | "timeline" | "issues" | "suggestions";

export function ReportView({ report, source, onReset }: { report: AnalysisReport; source: string; onReset: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(report.evidence[0]?.id ?? null);
  const [feedback, setFeedback] = useState<"up" | "down" | "sent" | null>(null);
  const evidenceMap = useMemo(() => new Map(report.evidence.map((item, index) => [item.id, { ...item, number: index + 1 }])), [report.evidence]);
  const activeEvidence = report.evidence.find((item) => item.id === activeEvidenceId) ?? null;

  function citations(ids: string[]) {
    return <span className="citation-row">{ids.map((id) => {
      const item = evidenceMap.get(id);
      return item ? <button key={id} className={activeEvidenceId === id ? "active" : ""} onClick={() => setActiveEvidenceId(id)} aria-label={`Show evidence ${item.number}`}>{item.number}</button> : null;
    })}</span>;
  }

  async function sendFeedback(helpful: boolean) {
    setFeedback(helpful ? "up" : "down");
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: report.id, helpful }),
      });
      setFeedback("sent");
    } catch {
      // Feedback must never interrupt reading a completed report.
    }
  }

  return <div className="report-view">
    <div className="report-header">
      <div><span className="step-tag">02 / ANALYSIS</span><h2>{report.title}</h2><p>{report.wordCount} words · {report.characters.length} characters · {report.timeline.length} scene beats</p></div>
      <div className="report-actions"><span className="grounded-score"><i /> {Math.round(report.overallConfidence * 100)}% grounded</span><button onClick={onReset}><RotateCcw size={15} /> New</button></div>
    </div>
    <div className="report-tabs" role="tablist">
      {(["overview", "characters", "timeline", "issues", "suggestions"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}<span>{tabCount(item, report)}</span></button>)}
    </div>

    <div className="report-scroll">
      {report.refusal && <div className="refusal-banner"><AlertTriangle size={18} /><div><strong>Evidence confidence: low</strong><p>{report.refusal.message}</p></div></div>}
      {tab === "overview" && <>
        <section className="report-section summary-section"><div className="section-kicker">Executive summary</div><p>{report.summary.text} {citations(report.summary.evidenceIds)}</p></section>
        <section className="report-section"><div className="section-title"><div><span>Continuity scan</span><h3>What deserves a second look</h3></div><small>{report.contradictions.length + report.consistencyIssues.length} signals</small></div>
          <div className="finding-list">{[...report.contradictions, ...report.consistencyIssues].slice(0, 3).map((finding) => <article key={finding.id}><span className={`severity ${finding.severity}`}>{finding.severity}</span><div><h4>{finding.title}</h4><p>{finding.detail}</p>{citations(finding.evidenceIds)}</div><b>{Math.round(finding.confidence * 100)}%</b></article>)}{report.contradictions.length + report.consistencyIssues.length === 0 && <div className="clean-state"><CheckCircle2 size={20} /> No evidence-backed continuity conflicts were found.</div>}</div>
        </section>
        <section className="report-section pacing-card"><div><span className="section-kicker">Pacing</span><strong>{report.pacing.score}</strong><small>/ 100</small></div><div><h3>{report.pacing.verdict}</h3><div className="pace-bars">{report.pacing.sections.map((section) => <i key={section.id} className={section.pace} title={section.note} />)}</div><p>{report.pacing.sections[0]?.note}</p></div></section>
      </>}

      {tab === "characters" && <section className="report-section"><div className="section-title"><div><span>Character map</span><h3>People on the page</h3></div><Users size={19} /></div><div className="character-list">{report.characters.map((character, index) => <article key={character.id}><div className="avatar">{character.name.slice(0, 1)}</div><div><h4>{character.name}</h4><span>{character.role}</span><p>{character.description}</p>{citations(character.evidenceIds)}</div><small>{String(index + 1).padStart(2, "0")}</small></article>)}</div><div className="relationship-list">{report.relationships.map((relationship) => <article key={relationship.id}><span>{relationship.source}</span><i>→</i><span>{relationship.target}</span><b>{relationship.type}</b><p>{relationship.detail} {citations(relationship.evidenceIds)}</p></article>)}</div></section>}

      {tab === "timeline" && <section className="report-section"><div className="section-title"><div><span>Story time</span><h3>Event sequence</h3></div><small>{report.timeline.length} beats</small></div><div className="timeline-list">{report.timeline.map((event) => <article key={event.id}><div><i>{event.order}</i><span /></div><div>{event.timeMarker && <small>{event.timeMarker}</small>}<h4>{event.label}</h4><p>{event.description}</p>{citations(event.evidenceIds)}</div></article>)}</div></section>}

      {tab === "issues" && <section className="report-section"><div className="section-title"><div><span>Editorial diagnostics</span><h3>Contradictions & consistency</h3></div><AlertTriangle size={19} /></div><div className="issue-grid">{[...report.contradictions, ...report.consistencyIssues].map((finding) => <article key={finding.id}><div><span className={`severity ${finding.severity}`}>{finding.severity}</span><b>{Math.round(finding.confidence * 100)}% confidence</b></div><h4>{finding.title}</h4><p>{finding.detail}</p>{citations(finding.evidenceIds)}</article>)}</div></section>}

      {tab === "suggestions" && <section className="report-section"><div className="section-title"><div><span>Revision plan</span><h3>Highest-leverage next moves</h3></div><ArrowUpRight size={19} /></div><div className="suggestion-list">{report.suggestions.map((suggestion, index) => <article key={suggestion.id}><span>{String(index + 1).padStart(2, "0")}</span><div><div><h4>{suggestion.title}</h4><small>{suggestion.impact} impact</small></div><p>{suggestion.rationale}</p><strong>Try this</strong><p>{suggestion.action}</p>{citations(suggestion.evidenceIds)}</div></article>)}</div></section>}

      <SourceEvidence source={source} activeEvidence={activeEvidence} number={activeEvidence ? evidenceMap.get(activeEvidence.id)?.number : undefined} />
      <div className="report-feedback"><span>{feedback === "sent" ? "Thanks—your feedback is recorded." : "Was this review useful?"}</span>{feedback !== "sent" && <div><button className={feedback === "up" ? "active" : ""} onClick={() => sendFeedback(true)}><ThumbsUp size={13} /> Yes</button><button className={feedback === "down" ? "active" : ""} onClick={() => sendFeedback(false)}><ThumbsDown size={13} /> Not yet</button></div>}</div>
      <div className="report-meta"><span>Provider: {report.meta.provider}</span><span>Model: {report.meta.model}</span><span>{(report.meta.durationMs / 1000).toFixed(1)}s</span>{report.meta.cached && <span>Cached</span>}</div>
    </div>
  </div>;
}

function SourceEvidence({ source, activeEvidence, number }: { source: string; activeEvidence: Evidence | null; number?: number }) {
  if (!activeEvidence) return null;
  const before = source.slice(0, activeEvidence.start);
  const quote = source.slice(activeEvidence.start, activeEvidence.end);
  const after = source.slice(activeEvidence.end);
  return <section className="source-evidence"><div className="source-title"><span><Quote size={14} /> Source evidence {number}</span><small>{Math.round(activeEvidence.confidence * 100)}% match confidence</small></div><p>{before}<mark>{quote}</mark>{after}</p></section>;
}

function tabCount(tab: Tab, report: AnalysisReport): number {
  if (tab === "characters") return report.characters.length;
  if (tab === "timeline") return report.timeline.length;
  if (tab === "issues") return report.contradictions.length + report.consistencyIssues.length;
  if (tab === "suggestions") return report.suggestions.length;
  return 1;
}
