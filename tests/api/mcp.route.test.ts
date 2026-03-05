import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
    hostel: { findFirst: vi.fn() },
    block: { count: vi.fn() },
    floor: { count: vi.fn() },
    room: { findMany: vi.fn(), count: vi.fn() },
    bed: { count: vi.fn() },
    allocation: { count: vi.fn(), findMany: vi.fn() },
    invoice: { findMany: vi.fn() }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("/api/mcp route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    process.env = {
      ...originalEnv,
      MCP_ENABLED: "true",
      MCP_INTERNAL_TOKEN: "mcp-secret",
      MCP_MAX_ROWS: "100"
    };

    mocks.prisma.$queryRawUnsafe.mockResolvedValue([]);
    mocks.prisma.hostel.findFirst.mockResolvedValue(null);
    mocks.prisma.block.count.mockResolvedValue(0);
    mocks.prisma.floor.count.mockResolvedValue(0);
    mocks.prisma.room.count.mockResolvedValue(0);
    mocks.prisma.bed.count.mockResolvedValue(0);
    mocks.prisma.allocation.count.mockResolvedValue(0);
    mocks.prisma.room.findMany.mockResolvedValue([]);
    mocks.prisma.allocation.findMany.mockResolvedValue([]);
    mocks.prisma.invoice.findMany.mockResolvedValue([]);
  });

  it("returns 401 when token is missing", async () => {
    const { POST } = await import("@/app/api/mcp/route");
    const response = await POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {}
        })
      })
    );

    expect(response.status).toBe(401);
  }, 20_000);

  it("returns 404 when mcp feature is disabled", async () => {
    process.env.MCP_ENABLED = "false";

    const { POST } = await import("@/app/api/mcp/route");
    const response = await POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "x-mcp-token": "mcp-secret"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/list",
          params: {}
        })
      })
    );

    expect(response.status).toBe(404);
  }, 20_000);

  it("lists tools for authorized requests", async () => {
    const { POST } = await import("@/app/api/mcp/route");
    const response = await POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "x-mcp-token": "mcp-secret",
          "mcp-protocol-version": "2025-03-26"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        })
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    const toolNames = (payload.result?.tools || []).map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain("rooms.search");
    expect(toolNames).toContain("schema.describe");
  });

  it("calls schema.describe tool successfully", async () => {
    mocks.prisma.$queryRawUnsafe.mockResolvedValue([
      {
        table_name: "room",
        column_name: "room_number",
        data_type: "text",
        is_nullable: "NO"
      }
    ]);

    const { POST } = await import("@/app/api/mcp/route");
    const response = await POST(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          "x-mcp-token": "mcp-secret",
          "mcp-protocol-version": "2025-03-26"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "schema.describe",
            arguments: {}
          }
        })
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    const text = payload.result?.content?.[0]?.text || "";
    expect(text.toLowerCase()).toContain("schema");
  });
});
