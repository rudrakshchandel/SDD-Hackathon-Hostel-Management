import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isSlackEnabled: vi.fn(),
  verifySlackRequest: vi.fn(),
  answerSlackQuery: vi.fn()
}));

vi.mock("@/lib/feature-flags", () => ({
  isSlackEnabled: mocks.isSlackEnabled
}));

vi.mock("@/lib/slack", () => ({
  verifySlackRequest: mocks.verifySlackRequest
}));

vi.mock("@/lib/slack-assistant", () => ({
  answerSlackQuery: mocks.answerSlackQuery
}));

describe("slack routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSlackEnabled.mockReturnValue(false);
    mocks.verifySlackRequest.mockReturnValue({ ok: false, error: "invalid" });
    mocks.answerSlackQuery.mockResolvedValue("ok");
  });

  it("returns disabled response for slash command when flag is off", async () => {
    const { POST } = await import("@/app/api/slack/command/route");
    const response = await POST(
      new Request("http://localhost/api/slack/command", {
        method: "POST",
        body: "command=/hostel&text=vacancy"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.text).toContain("disabled");
  });

  it("returns challenge for events url verification even when disabled", async () => {
    const { POST } = await import("@/app/api/slack/events/route");
    const response = await POST(
      new Request("http://localhost/api/slack/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "url_verification", challenge: "abc123" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.challenge).toBe("abc123");
  });

  it("returns 401 for invalid signatures when slack is enabled", async () => {
    mocks.isSlackEnabled.mockReturnValue(true);
    mocks.verifySlackRequest.mockReturnValue({ ok: false, error: "bad-signature" });

    const { POST } = await import("@/app/api/slack/command/route");
    const response = await POST(
      new Request("http://localhost/api/slack/command", {
        method: "POST",
        headers: {
          "x-slack-signature": "x",
          "x-slack-request-timestamp": "1"
        },
        body: "command=/hostel&text=vacancy"
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.error).toBe("bad-signature");
  });
});

