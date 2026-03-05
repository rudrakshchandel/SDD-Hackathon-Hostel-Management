import { describe, expect, it } from "vitest";

describe("mcp auth", () => {
  it("rejects when token header is missing", async () => {
    const { requireMcpAuth } = await import("@/lib/mcp/auth");
    const response = requireMcpAuth(
      new Request("http://localhost/api/mcp", { method: "POST" }),
      "secret"
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  it("rejects when token does not match", async () => {
    const { requireMcpAuth } = await import("@/lib/mcp/auth");
    const response = requireMcpAuth(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "x-mcp-token": "wrong" }
      }),
      "secret"
    );

    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
  });

  it("accepts when token matches", async () => {
    const { requireMcpAuth } = await import("@/lib/mcp/auth");
    const response = requireMcpAuth(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "x-mcp-token": "secret" }
      }),
      "secret"
    );

    expect(response).toBeNull();
  });
});
