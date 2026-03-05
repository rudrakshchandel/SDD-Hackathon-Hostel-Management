import { describe, expect, it } from "vitest";

describe("mcp redaction", () => {
  it("masks email values", async () => {
    const { maskEmail } = await import("@/lib/mcp/redaction");
    expect(maskEmail("resident@example.com")).toBe("r******t@example.com");
  });

  it("masks contact values", async () => {
    const { maskContact } = await import("@/lib/mcp/redaction");
    expect(maskContact("9876543210")).toBe("********10");
  });

  it("masks id numbers", async () => {
    const { maskIdNumber } = await import("@/lib/mcp/redaction");
    expect(maskIdNumber("ABCDE1234F")).toBe("AB******4F");
  });
});
