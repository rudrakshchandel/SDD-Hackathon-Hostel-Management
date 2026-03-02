import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  buildDashboardAiRequest: vi.fn(),
  parseOpenAiError: vi.fn()
}));

vi.mock("@/lib/dashboard-ai", () => ({
  buildDashboardAiRequest: mocks.buildDashboardAiRequest,
  parseOpenAiError: mocks.parseOpenAiError
}));

describe("/api/assistant/stream POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.parseOpenAiError.mockReturnValue("upstream failure");
    mocks.buildDashboardAiRequest.mockResolvedValue({
      url: "https://example.com/stream",
      intent: "general",
      headers: { "Content-Type": "application/json" },
      body: { ok: true }
    });
  });

  it("returns 400 for empty query", async () => {
    const { POST } = await import("@/app/api/assistant/stream/route");
    const response = await POST(
      new Request("http://localhost/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("query is required");
  });

  it("returns upstream error payload when provider call fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ error: { message: "provider down" } })
      })
    );

    const { POST } = await import("@/app/api/assistant/stream/route");
    const response = await POST(
      new Request("http://localhost/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "hello" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload.error).toBe("upstream failure");
  });

  it("splits large deltas into multiple stream events", async () => {
    const upstreamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"abcdefghijklmnopqrstuvwxyz"}]}}]}\n\n'
          )
        );
        controller.close();
      }
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: upstreamBody
      })
    );

    const { POST } = await import("@/app/api/assistant/stream/route");
    const response = await POST(
      new Request("http://localhost/api/assistant/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "hello" })
      })
    );

    expect(response.headers.get("content-type")).toContain("text/event-stream");

    const payload = await response.text();
    const deltaCount = (payload.match(/"type":"delta"/g) || []).length;
    expect(deltaCount).toBeGreaterThan(1);
  });
});

