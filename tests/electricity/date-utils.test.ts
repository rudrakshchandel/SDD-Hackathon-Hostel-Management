import { describe, expect, it } from "vitest";
import { calculateOverlapDays } from "@/lib/electricity/date-utils";

describe("calculateOverlapDays", () => {
  it("returns inclusive overlap days", () => {
    const overlap = calculateOverlapDays(
      new Date("2026-03-01"),
      new Date("2026-03-31"),
      new Date("2026-03-10"),
      new Date("2026-03-12")
    );
    expect(overlap).toBe(3);
  });

  it("returns 0 when no overlap", () => {
    const overlap = calculateOverlapDays(
      new Date("2026-03-01"),
      new Date("2026-03-05"),
      new Date("2026-03-10"),
      new Date("2026-03-12")
    );
    expect(overlap).toBe(0);
  });
});
