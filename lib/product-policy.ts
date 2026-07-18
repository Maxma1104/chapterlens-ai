export const DAILY_ANALYSIS_LIMIT = 5;
export const DEFAULT_OPENAI_MODEL = "gpt-5.6-luna";
export const MIN_TEXT_LENGTH = 120;
export const MAX_TEXT_LENGTH = 50_000;
export const MAX_TITLE_LENGTH = 120;

export function resolvedOpenAIModel(): string {
  return process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
}
