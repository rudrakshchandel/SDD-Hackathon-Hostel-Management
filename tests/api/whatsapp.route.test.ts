import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isWhatsAppEnabled: vi.fn(),
  verifyWhatsAppRequest: vi.fn(),
  parseWhatsAppAllowlist: vi.fn(),
  normalizeWhatsAppNumber: vi.fn(),
  isWhatsAppNumberAllowed: vi.fn(),
  formatWhatsAppText: vi.fn(),
  checkRateLimitByKey: vi.fn(),
  sanitizeAssistantQuery: vi.fn(),
  answerDashboardQuestion: vi.fn(),
  sendWhatsAppTextMessage: vi.fn(),
  prisma: {
    whatsappWebhookHit: {
      create: vi.fn(),
      update: vi.fn()
    },
    whatsappInboundMessage: {
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/lib/feature-flags", () => ({
  isWhatsAppEnabled: mocks.isWhatsAppEnabled
}));

vi.mock("@/lib/whatsapp", () => ({
  verifyWhatsAppRequest: mocks.verifyWhatsAppRequest,
  parseWhatsAppAllowlist: mocks.parseWhatsAppAllowlist,
  normalizeWhatsAppNumber: mocks.normalizeWhatsAppNumber,
  isWhatsAppNumberAllowed: mocks.isWhatsAppNumberAllowed,
  formatWhatsAppText: mocks.formatWhatsAppText
}));

vi.mock("@/lib/auth-rate-limit", () => ({
  checkRateLimitByKey: mocks.checkRateLimitByKey
}));

vi.mock("@/lib/dashboard-ai", () => ({
  sanitizeAssistantQuery: mocks.sanitizeAssistantQuery,
  answerDashboardQuestion: mocks.answerDashboardQuestion
}));

vi.mock("@/lib/whatsapp-client", () => ({
  sendWhatsAppTextMessage: mocks.sendWhatsAppTextMessage
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

function webhookPayload(messageId = "wamid-1", text = "Finance summary for hostel") {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: messageId,
                  from: "919876543210",
                  type: "text",
                  text: { body: text }
                }
              ]
            }
          }
        ]
      }
    ]
  };
}

describe("/api/whatsapp/webhook", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mocks.isWhatsAppEnabled.mockReturnValue(true);
    mocks.verifyWhatsAppRequest.mockReturnValue({ ok: true });
    mocks.parseWhatsAppAllowlist.mockReturnValue(["+919876543210"]);
    mocks.normalizeWhatsAppNumber.mockImplementation((n: string) => `+${n.replace(/^\+/, "")}`);
    mocks.isWhatsAppNumberAllowed.mockReturnValue(true);
    mocks.formatWhatsAppText.mockImplementation((text: string) => text);
    mocks.checkRateLimitByKey.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    mocks.sanitizeAssistantQuery.mockReturnValue({ ok: true, value: "Finance summary for hostel" });
    mocks.answerDashboardQuestion.mockResolvedValue({ answer: "Invoiced ₹10000" });
    mocks.sendWhatsAppTextMessage.mockResolvedValue({ messageId: "wamid-out" });
    mocks.prisma.whatsappWebhookHit.create.mockResolvedValue({ id: "hit-1" });
    mocks.prisma.whatsappWebhookHit.update.mockResolvedValue({ id: "hit-1" });
    mocks.prisma.whatsappInboundMessage.create.mockResolvedValue({ id: "1" });
    mocks.prisma.whatsappInboundMessage.update.mockResolvedValue({ id: "1" });
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("returns disabled response when feature flag is off", async () => {
    mocks.isWhatsAppEnabled.mockReturnValue(false);

    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload())
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.disabled).toBe(true);
    expect(mocks.prisma.whatsappWebhookHit.create).toHaveBeenCalledTimes(1);
  });

  it("handles GET verification challenge", async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "verify-token";

    const { GET } = await import("@/app/api/whatsapp/webhook/route");
    const response = await GET(
      new Request(
        "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-token&hub.challenge=abc"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("abc");
    expect(mocks.prisma.whatsappWebhookHit.create).toHaveBeenCalledTimes(1);
  });

  it("accepts webhook payload even when signature header is missing", async () => {
    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload())
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.prisma.whatsappWebhookHit.create).toHaveBeenCalledTimes(1);
    expect(mocks.answerDashboardQuestion).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).not.toHaveBeenCalledWith(
      "[wa-webhook] signature verification failed",
      expect.anything()
    );
  });

  it("blocks non-allowlisted numbers with generic reply", async () => {
    mocks.isWhatsAppNumberAllowed.mockReturnValue(false);

    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload())
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.sendWhatsAppTextMessage).toHaveBeenCalledTimes(1);
    expect(mocks.answerDashboardQuestion).not.toHaveBeenCalled();
  });

  it("dedupes duplicate provider messages and still returns 200", async () => {
    mocks.prisma.whatsappInboundMessage.create.mockRejectedValue({ code: "P2002" });

    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload("wamid-dup"))
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.answerDashboardQuestion).not.toHaveBeenCalled();
    expect(mocks.sendWhatsAppTextMessage).not.toHaveBeenCalled();
  });

  it("processes allowed inbound text and sends AI response", async () => {
    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload())
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.answerDashboardQuestion).toHaveBeenCalledTimes(1);
    expect(mocks.sendWhatsAppTextMessage).toHaveBeenNthCalledWith(
      1,
      "+919876543210",
      "Got your message. I am checking this now."
    );
    expect(mocks.sendWhatsAppTextMessage).toHaveBeenNthCalledWith(
      2,
      "+919876543210",
      "Invoiced ₹10000"
    );
  });

  it("returns rate-limit notice when sender exceeds threshold", async () => {
    mocks.checkRateLimitByKey.mockReturnValue({
      allowed: false,
      retryAfterSeconds: 90,
      remainingAttempts: 0
    });

    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(webhookPayload())
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.sendWhatsAppTextMessage).toHaveBeenCalled();
    expect(mocks.answerDashboardQuestion).not.toHaveBeenCalled();
  });

  it("acknowledges webhook when payload has no inbound text messages", async () => {
    const { POST } = await import("@/app/api/whatsapp/webhook/route");
    const response = await POST(
      new Request("http://localhost/api/whatsapp/webhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({})
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.processed).toBe(0);
    expect(payload.ack).toContain("payload is empty");
    expect(mocks.sendWhatsAppTextMessage).not.toHaveBeenCalled();
    expect(mocks.prisma.whatsappWebhookHit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: "empty_payload",
          messageCount: 0,
          processedCount: 0
        })
      })
    );
  });
});
