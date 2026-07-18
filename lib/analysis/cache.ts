import { createHash, randomUUID } from "node:crypto";
import type { AnalysisReport } from "./schema";

type CacheEntry = { expiresAt: number; report: AnalysisReport };
const cache = new Map<string, CacheEntry>();
const MAX_ENTRIES = 100;
const TTL_MS = 24 * 60 * 60 * 1000;

export function analysisCacheKey(text: string, title: string, model: string): string {
  return createHash("sha256").update(`${model}\0${title}\0${text}`).digest("hex");
}

export function getCachedAnalysis(key: string): AnalysisReport | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return {
    ...entry.report,
    id: randomUUID(),
    meta: { ...entry.report.meta, cached: true },
  };
}

export function setCachedAnalysis(key: string, report: AnalysisReport): void {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value ?? "");
  cache.set(key, { expiresAt: Date.now() + TTL_MS, report });
}
