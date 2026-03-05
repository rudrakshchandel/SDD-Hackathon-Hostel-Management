import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $queryRawUnsafe: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("mcp schema tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns allowlisted table metadata only", async () => {
    mocks.prisma.$queryRawUnsafe.mockResolvedValue([
      {
        table_name: "room",
        column_name: "room_number",
        data_type: "text",
        is_nullable: "NO"
      },
      {
        table_name: "unknown_table",
        column_name: "secret",
        data_type: "text",
        is_nullable: "YES"
      }
    ]);

    const { describeSchemaForMcp } = await import("@/lib/mcp/tools/schema");
    const result = await describeSchemaForMcp();

    expect(result.tables.some((table) => table.tableName === "room")).toBe(true);
    expect(result.tables.some((table) => table.tableName === "unknown_table")).toBe(false);
  });
});
