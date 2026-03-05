import { beforeEach, describe, expect, it, vi } from "vitest";

describe("mcp config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.MCP_ENABLED;
    delete process.env.MCP_INTERNAL_TOKEN;
    delete process.env.MCP_MAX_ROWS;
  });

  it("uses defaults when vars are missing", async () => {
    const { getMcpConfig } = await import("@/lib/mcp/config");
    const config = getMcpConfig();

    expect(config.enabled).toBe(false);
    expect(config.internalToken).toBe("");
    expect(config.maxRows).toBe(100);
  });

  it("parses enabled flag and clamps max rows", async () => {
    process.env.MCP_ENABLED = "true";
    process.env.MCP_INTERNAL_TOKEN = "internal-token";
    process.env.MCP_MAX_ROWS = "1000";

    const { getMcpConfig } = await import("@/lib/mcp/config");
    const config = getMcpConfig();

    expect(config.enabled).toBe(true);
    expect(config.internalToken).toBe("internal-token");
    expect(config.maxRows).toBe(200);
  });

  it("applies minimum bound for max rows", async () => {
    process.env.MCP_MAX_ROWS = "0";

    const { getMcpConfig } = await import("@/lib/mcp/config");
    const config = getMcpConfig();

    expect(config.maxRows).toBe(1);
  });
});
