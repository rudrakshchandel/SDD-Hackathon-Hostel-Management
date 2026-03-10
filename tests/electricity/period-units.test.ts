import { describe, expect, it } from "vitest";
import { calculatePeriodUnits } from "@/lib/electricity/readings";

function d(value: string) {
  return new Date(value);
}

describe("calculatePeriodUnits", () => {
  it("uses baseline before period and latest reading within period", () => {
    const readings = [
      { readingDate: d("2026-02-28"), currentReading: 100, status: "VALID" },
      { readingDate: d("2026-03-15"), currentReading: 140, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(40);
  });

  it("returns 0 when there is no baseline before period", () => {
    const readings = [
      { readingDate: d("2026-03-05"), currentReading: 150, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(0);
  });

  it("ignores readings after period end", () => {
    const readings = [
      { readingDate: d("2026-02-28"), currentReading: 80, status: "VALID" },
      { readingDate: d("2026-04-02"), currentReading: 110, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(0);
  });
});
