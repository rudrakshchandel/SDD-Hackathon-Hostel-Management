import { describe, expect, it } from "vitest";
import { recomputeReadingChain } from "@/lib/electricity/readings";

function d(value: string) {
  return new Date(value);
}

describe("recomputeReadingChain", () => {
  it("recomputes subsequent readings from corrected value", () => {
    const readings = [
      { id: "r1", readingDate: d("2026-03-05"), currentReading: 140 },
      { id: "r2", readingDate: d("2026-03-10"), currentReading: 160 }
    ];

    const result = recomputeReadingChain({
      previousReading: 100,
      readings,
      correctedId: "r1"
    });

    expect(result).toEqual([
      { id: "r1", previousReading: 100, unitsConsumed: 40, status: "CORRECTED" },
      { id: "r2", previousReading: 140, unitsConsumed: 20, status: "VALID" }
    ]);
  });

  it("marks reset review when current < previous", () => {
    const readings = [
      { id: "r1", readingDate: d("2026-03-05"), currentReading: 90 }
    ];

    const result = recomputeReadingChain({
      previousReading: 100,
      readings,
      correctedId: "r1"
    });

    expect(result).toEqual([
      { id: "r1", previousReading: 100, unitsConsumed: 0, status: "RESET_REVIEW" }
    ]);
  });
});
