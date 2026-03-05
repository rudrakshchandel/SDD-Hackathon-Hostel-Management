import { createHmac } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  formatWhatsAppText,
  isWhatsAppNumberAllowed,
  normalizeWhatsAppNumber,
  parseWhatsAppAllowlist,
  verifyWhatsAppRequest
} from "@/lib/whatsapp";

describe("whatsapp helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.WHATSAPP_APP_SECRET;
    delete process.env.WHATSAPP_ALLOWED_NUMBERS;
  });

  it("verifies valid x-hub-signature-256", () => {
    process.env.WHATSAPP_APP_SECRET = "test-secret";
    const rawBody = JSON.stringify({ test: true });
    const signature = createHmac("sha256", "test-secret").update(rawBody).digest("hex");
    const headers = new Headers({
      "x-hub-signature-256": `sha256=${signature}`
    });

    const result = verifyWhatsAppRequest(headers, rawBody);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid signature", () => {
    process.env.WHATSAPP_APP_SECRET = "test-secret";
    const result = verifyWhatsAppRequest(
      new Headers({ "x-hub-signature-256": "sha256=deadbeef" }),
      "{}"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.toLowerCase()).toContain("failed");
    }
  });

  it("normalizes and checks allowlisted numbers", () => {
    process.env.WHATSAPP_ALLOWED_NUMBERS = "+919876543210, 00919876543211";

    const allowlist = parseWhatsAppAllowlist();
    expect(allowlist).toEqual(["+919876543210", "+919876543211"]);
    expect(normalizeWhatsAppNumber("9876543210")).toBe("+9876543210");
    expect(isWhatsAppNumberAllowed("+919876543210", allowlist)).toBe(true);
    expect(isWhatsAppNumberAllowed("+919800000000", allowlist)).toBe(false);
  });

  it("formats and truncates markdown-ish content for whatsapp text", () => {
    const formatted = formatWhatsAppText(
      "# Heading\n**Bold**\n- item\n" + "a".repeat(5000)
    );

    expect(formatted).not.toContain("**");
    expect(formatted).toContain("Heading");
    expect(formatted.length).toBeLessThanOrEqual(4096);
  });
});
