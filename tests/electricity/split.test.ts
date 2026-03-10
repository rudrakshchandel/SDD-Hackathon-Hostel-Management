import { describe, expect, it } from "vitest";
import { calculateShares } from "@/lib/electricity/split";

describe("calculateShares", () => {
  it("splits equally when stays are full", () => {
    const shares = calculateShares(1000, [30, 30, 30]);
    expect(shares).toEqual([333.33, 333.33, 333.34]);
  });

  it("splits by stay duration when partial", () => {
    const shares = calculateShares(900, [10, 20]);
    expect(shares).toEqual([300, 600]);
  });
});
