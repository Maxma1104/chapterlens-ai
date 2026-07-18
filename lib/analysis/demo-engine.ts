import { validateAndGroundReport } from "./evidence";
import type { AnalysisDraft, AnalysisReport, Evidence } from "./schema";
import type { StageReporter } from "./stages";

const NAME_STOP_WORDS = new Set([
  "At",
  "Rain",
  "Two",
  "The",
  "Now",
  "He",
  "She",
  "It",
  "Chapter",
  "Captain",
]);

function paragraphsFrom(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length >= 3) return paragraphs;
  return text
    .split(/(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function extractNames(text: string): string[] {
  const candidates = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? [];
  const counts = new Map<string, number>();
  for (const name of candidates) {
    if (!NAME_STOP_WORDS.has(name)) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const recurring = sorted.filter(([, count]) => count >= 2);
  return (recurring.length > 0 ? recurring : sorted)
    .slice(0, 6)
    .map(([name]) => name);
}

function makeEvidence(text: string, paragraphs: string[], requiredNames: string[]): Evidence[] {
  const selectedParagraphs = paragraphs.slice(0, 8);
  for (const name of requiredNames) {
    const characterParagraph = paragraphs.find((paragraph) => paragraph.includes(name));
    if (characterParagraph && !selectedParagraphs.includes(characterParagraph)) {
      selectedParagraphs.push(characterParagraph);
    }
  }

  return selectedParagraphs.map((quote, index) => {
    const start = text.indexOf(quote);
    return {
      id: `e${index + 1}`,
      quote,
      start,
      end: start + quote.length,
      confidence: 0.94,
    };
  });
}

function detectLanguage(text: string): string {
  return /[\u3400-\u9fff]/u.test(text) ? "Chinese" : "English";
}

export async function analyzeWithDemoEngine(
  text: string,
  title = "Untitled chapter",
  reportStage?: StageReporter,
): Promise<AnalysisReport> {
  const startedAt = performance.now();
  await reportStage?.("extracting");
  const paragraphs = paragraphsFrom(text);
  const names = extractNames(text);
  await reportStage?.("indexing");
  const evidence = makeEvidence(text, paragraphs, names);
  const ids = evidence.map((item) => item.id);
  const [firstName = "the viewpoint character", secondName = "the other character"] = names;
  const hasLockedRoomSignal = /lock|key|door|undamaged/iu.test(text);
  const hasKnowledgeSignal = /never met|promised/iu.test(text);
  const hasTimeSignal = /\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?/iu.test(text);
  const sharedRelationshipEvidence = names.length >= 2
    ? evidence
        .filter((item) => item.quote.includes(names[0]) && item.quote.includes(names[1]))
        .slice(0, 1)
        .map((item) => item.id)
    : [];

  await reportStage?.("analyzing");
  const draft: AnalysisDraft = {
    title,
    language: detectLanguage(text),
    summary: {
      text: `${firstName} drives a tense, evidence-rich scene in which ${secondName}'s actions introduce an unresolved question. The passage escalates through concrete actions and closes on withheld information.`,
      evidenceIds: ids.slice(0, Math.min(3, ids.length)),
    },
    evidence,
    characters: names.map((name, index) => ({
      id: `c${index + 1}`,
      name,
      role: index === 0 ? "Primary scene participant" : "Scene participant",
      description: `${name} is directly named and acts or is observed in the submitted passage.`,
      evidenceIds: evidence
        .filter((item) => item.quote.includes(name))
        .slice(0, 2)
        .map((item) => item.id),
    })),
    relationships:
      names.length >= 2 && sharedRelationshipEvidence.length > 0
        ? [
            {
              id: "r1",
              source: names[0],
              target: names[1],
              type: "Tense prior connection",
              detail: "Their exchange implies shared knowledge and conflicting immediate goals.",
              evidenceIds: sharedRelationshipEvidence,
            },
          ]
        : [],
    timeline: evidence.slice(0, 5).map((item, index) => ({
      id: `t${index + 1}`,
      order: index + 1,
      label: `Beat ${index + 1}`,
      description:
        item.quote.length > 130 ? `${item.quote.slice(0, 127).trim()}…` : item.quote,
      timeMarker: item.quote.match(/\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?/iu)?.[0],
      evidenceIds: [item.id],
    })),
    contradictions: [
      ...(hasLockedRoomSignal && evidence.length >= 2
        ? [
            {
              id: "f1",
              title: "Locked-room mechanics need support",
              detail:
                "The access conditions and the later exit do not yet have an on-page causal bridge. This may be an intentional mystery, but the current excerpt cannot prove how it happened.",
              severity: "high" as const,
              confidence: 0.88,
              evidenceIds: ids.slice(0, 2),
            },
          ]
        : []),
      ...(hasTimeSignal && evidence.length >= 4
        ? [
            {
              id: "f2",
              title: "Conflicting time signals",
              detail:
                "The passage presents two clock readings that may be deliberate but currently create timeline uncertainty.",
              severity: "medium" as const,
              confidence: 0.91,
              evidenceIds: [ids[3]],
            },
          ]
        : []),
    ],
    consistencyIssues:
      hasKnowledgeSignal && evidence.length >= 3
        ? [
            {
              id: "f3",
              title: "Stated history conflicts with familiar dialogue",
              detail:
                "A claim that the characters never met sits beside dialogue implying a prior promise. Clarify whether the statement is a lie, a technical truth, or an error.",
              severity: "medium",
              confidence: 0.93,
              evidenceIds: [ids[2]],
            },
          ]
        : [],
    pacing: {
      score: 82,
      verdict: "Taut and escalating",
      evidenceIds: ids.slice(0, Math.min(4, ids.length)),
      sections: evidence.slice(0, 4).map((item, index) => ({
        id: `p${index + 1}`,
        label: index === 0 ? "Setup" : index === evidence.length - 1 ? "Turn" : "Escalation",
        pace: index === 0 ? "balanced" : "fast",
        note:
          index === 0
            ? "Concrete objects and time establish the scene efficiently."
            : "New information arrives before the previous question is resolved.",
        evidenceIds: [item.id],
      })),
    },
    suggestions: [
      {
        id: "s1",
        title: "Plant one fair-play access clue",
        rationale:
          "The locked-room question is compelling, but one sensory or physical clue would make the mystery feel intentional rather than accidental.",
        action:
          "Add a small observable detail near the door, key, window, or character movement without revealing the solution.",
        impact: "high",
        evidenceIds: ids.slice(0, Math.min(2, ids.length)),
      },
      {
        id: "s2",
        title: "Make the final beat do double duty",
        rationale: "The closing action creates suspicion and can also sharpen character motive.",
        action:
          "Tie the withheld information to a visible emotional reaction or immediate consequence.",
        impact: "medium",
        evidenceIds: [ids[Math.min(3, ids.length - 1)]],
      },
    ],
  };

  await reportStage?.("validating");
  return validateAndGroundReport(text, draft, {
    provider: "chapterlens",
    model: "deterministic-demo-v1",
    durationMs: Math.max(1, Math.round(performance.now() - startedAt)),
    estimatedCostUsd: 0,
    verificationMode: "exact_match",
  });
}
