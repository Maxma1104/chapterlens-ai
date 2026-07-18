import { z } from "zod";
import {
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_TEXT_LENGTH,
} from "@/lib/product-policy";

export const analysisInputSchema = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH).optional().default("Untitled chapter"),
  text: z
    .string()
    .trim()
    .min(MIN_TEXT_LENGTH, `Add at least ${MIN_TEXT_LENGTH} characters to analyze.`)
    .max(MAX_TEXT_LENGTH, `Text cannot exceed ${MAX_TEXT_LENGTH.toLocaleString()} characters.`),
});

export const evidenceSchema = z.object({
  id: z.string().min(1),
  quote: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  confidence: z.number().min(0).max(1),
});

const citedTextSchema = z.object({
  text: z.string().min(1),
  evidenceIds: z.array(z.string()).min(1),
});

const reportCitedTextSchema = citedTextSchema.extend({
  evidenceIds: z.array(z.string()),
});

const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  evidenceIds: z.array(z.string()).min(1),
});

const relationshipSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  detail: z.string(),
  evidenceIds: z.array(z.string()).min(1),
});

const timelineEventSchema = z.object({
  id: z.string(),
  order: z.number().int().nonnegative(),
  label: z.string(),
  description: z.string(),
  timeMarker: z.string().optional(),
  evidenceIds: z.array(z.string()).min(1),
});

export const findingSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string()).min(1),
});

const pacingSectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  pace: z.enum(["slow", "balanced", "fast"]),
  note: z.string(),
  evidenceIds: z.array(z.string()).min(1),
});

const pacingSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.string(),
  evidenceIds: z.array(z.string()).min(1),
  sections: z.array(pacingSectionSchema),
});

const reportPacingSchema = pacingSchema.extend({
  evidenceIds: z.array(z.string()),
});

const suggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  rationale: z.string(),
  action: z.string(),
  impact: z.enum(["low", "medium", "high"]),
  evidenceIds: z.array(z.string()).min(1),
});

export const analysisDraftSchema = z.object({
  title: z.string(),
  language: z.string(),
  summary: citedTextSchema,
  evidence: z.array(evidenceSchema),
  characters: z.array(characterSchema),
  relationships: z.array(relationshipSchema),
  timeline: z.array(timelineEventSchema),
  contradictions: z.array(findingSchema),
  consistencyIssues: z.array(findingSchema),
  pacing: pacingSchema,
  suggestions: z.array(suggestionSchema),
});

export const analysisReportSchema = analysisDraftSchema.extend({
  summary: reportCitedTextSchema,
  pacing: reportPacingSchema,
  id: z.string(),
  wordCount: z.number().int().nonnegative(),
  overallConfidence: z.number().min(0).max(1),
  refusal: z
    .object({
      reason: z.string(),
      message: z.string(),
    })
    .optional(),
  meta: z.object({
    provider: z.string(),
    model: z.string(),
    durationMs: z.number().nonnegative(),
    inputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    estimatedCostUsd: z.number().nonnegative().optional(),
    cached: z.boolean().optional(),
    verificationMode: z.enum(["exact_match", "entailment"]).optional(),
  }),
});

export type AnalysisInput = z.infer<typeof analysisInputSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type AnalysisDraft = z.infer<typeof analysisDraftSchema>;
export type AnalysisReport = z.infer<typeof analysisReportSchema>;
export type AnalysisMeta = AnalysisReport["meta"];
