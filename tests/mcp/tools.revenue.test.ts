import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    invoice: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("mcp revenue tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invoiced, collected, dues and overdue totals", async () => {
    mocks.prisma.invoice.findMany.mockResolvedValue([
      {
        id: "inv-1",
        totalAmount: 10000,
        status: "ISSUED",
        dueDate: new Date("2026-02-01T00:00:00.000Z"),
        payments: [{ amount: 4000, status: "COMPLETED" }]
      },
      {
        id: "inv-2",
        totalAmount: 5000,
        status: "PAID",
        dueDate: new Date("2026-03-10T00:00:00.000Z"),
        payments: [{ amount: 5000, status: "COMPLETED" }]
      }
    ]);

    const { getRevenueSummaryForMcp } = await import("@/lib/mcp/tools/revenue");
    const result = await getRevenueSummaryForMcp({});

    expect(result.invoiced).toBe(15000);
    expect(result.collected).toBe(9000);
    expect(result.dues).toBe(6000);
    expect(result.overdueInvoices).toBe(1);
  });
});
