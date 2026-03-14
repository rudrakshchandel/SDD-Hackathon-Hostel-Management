import { describe, expect, it, vi } from "vitest";
// @ts-ignore
import { runSmokeTest } from "../../scripts/mcp-smoke.mjs";

describe("mcp smoke script", () => {
  it("calls tools/list then schema.describe and returns success summary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: "2.0",
          id: 1,
          result: {
            tools: [{ name: "schema.describe" }, { name: "rooms.search" }]
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jsonrpc: "2.0",
          id: 2,
          result: {
            content: [{ type: "text", text: "Schema metadata generated." }]
          }
        })
      });

    const result = await runMcpSmoke({
      baseUrl: "http://localhost:3000",
      token: "mcp-secret",
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(result.ok).toBe(true);
    expect(result.toolsCount).toBe(2);
    expect(result.calledTool).toBe("schema.describe");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("fails fast when token is missing", async () => {
    const result = await runMcpSmoke({
      baseUrl: "http://localhost:3000",
      token: ""
    });

    expect(result.ok).toBe(false);
    expect(result.error?.toLowerCase()).toContain("mcp_internal_token");
  });
});
