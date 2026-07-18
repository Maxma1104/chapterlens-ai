import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkDailyLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

describe("daily usage policy", () => {
  beforeEach(() => resetRateLimitsForTests());

  it("allows five analyses per identity and refuses the sixth until the next day", () => {
    vi.setSystemTime(new Date("2026-07-18T10:00:00Z"));

    for (let index = 0; index < 5; index += 1) {
      expect(checkDailyLimit("reader@example.com")).toMatchObject({ allowed: true });
    }
    expect(checkDailyLimit("reader@example.com")).toMatchObject({
      allowed: false,
      remaining: 0,
    });

    vi.setSystemTime(new Date("2026-07-19T10:00:00Z"));
    expect(checkDailyLimit("reader@example.com")).toMatchObject({
      allowed: true,
      remaining: 4,
    });

    vi.useRealTimers();
  });
});
