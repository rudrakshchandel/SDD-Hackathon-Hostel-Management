import { describe, expect, it } from "vitest";
import { evaluateReading } from "@/lib/electricity/readings";

describe("evaluateReading", () => {
  it("flags resets when current < previous", () => {
    const result = evaluateReading(90, 100);
    expect(result.status).toBe("RESET_REVIEW");
  });

  it("calculates units for valid reading", () => {
    const result = evaluateReading(150, 100);
    expect(result.status).toBe("VALID");
    expect(result.units).toBe(50);
  });
});
