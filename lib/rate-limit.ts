export const DAILY_ANALYSIS_LIMIT = 5;

type Usage = { date: string; count: number };
const usageByIdentity = new Map<string, Usage>();

function utcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function checkDailyLimit(identity: string): {
  allowed: boolean;
  remaining: number;
  resetAt: string;
} {
  const date = utcDateKey();
  const current = usageByIdentity.get(identity);
  const usage = !current || current.date !== date ? { date, count: 0 } : current;
  const resetAt = new Date(`${date}T00:00:00.000Z`);
  resetAt.setUTCDate(resetAt.getUTCDate() + 1);

  if (usage.count >= DAILY_ANALYSIS_LIMIT) {
    return { allowed: false, remaining: 0, resetAt: resetAt.toISOString() };
  }

  usage.count += 1;
  usageByIdentity.set(identity, usage);
  return {
    allowed: true,
    remaining: DAILY_ANALYSIS_LIMIT - usage.count,
    resetAt: resetAt.toISOString(),
  };
}

export function resetRateLimitsForTests(): void {
  usageByIdentity.clear();
}
