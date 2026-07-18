export const ANALYSIS_STAGES = [
  "cleaning",
  "extracting",
  "indexing",
  "analyzing",
  "validating",
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];
export type StageReporter = (stage: AnalysisStage) => void | Promise<void>;
