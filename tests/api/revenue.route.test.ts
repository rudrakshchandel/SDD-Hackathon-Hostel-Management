import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrismaInitializationError: vi.fn(),
  prisma: {
    invoice: {
      aggregate: vi.fn(),
      count: vi.fn()
    },
    payment: {
      aggregate: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaInitializationError: mocks.getPrismaInitializationError,
  prisma: mocks.prisma
}));

describe("/api/revenue GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrismaInitializationError.mockReturnValue(null);
    mocks.prisma.invoice.aggregate.mockResolvedValue({
      _sum: { totalAmount: 54000 }
    });
    mocks.prisma.payment.aggregate.mockResolvedValue({
      _sum: { amount: 32000 }
    });
    mocks.prisma.invoice.count.mockResolvedValue(6);
  });

  it("returns revenue aggregates on success", async () => {
    const { GET } = await import("@/app/api/revenue/route");
    const response = await GET(new Request("http://localhost/api/revenue"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.period).toBe("all");
    expect(payload.data.invoiced).toBe(54000);
    expect(payload.data.collected).toBe(32000);
    expect(payload.data.outstanding).toBe(22000);
  });

  it("returns 400 for invalid period filter", async () => {
    const { GET } = await import("@/app/api/revenue/route");
    const response = await GET(
      new Request("http://localhost/api/revenue?period=year")
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("period must be one of: all, month");
  });

  it("returns zeros for empty state aggregates", async () => {
    mocks.prisma.invoice.aggregate.mockResolvedValueOnce({
      _sum: { totalAmount: null }
    });
    mocks.prisma.payment.aggregate.mockResolvedValueOnce({
      _sum: { amount: null }
    });
    mocks.prisma.invoice.count.mockResolvedValueOnce(0);

    const { GET } = await import("@/app/api/revenue/route");
    const response = await GET(
      new Request("http://localhost/api/revenue?period=month")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.period).toBe("month");
    expect(payload.data.invoiced).toBe(0);
    expect(payload.data.collected).toBe(0);
    expect(payload.data.outstanding).toBe(0);
    expect(payload.data.pendingInvoices).toBe(0);
  });
});

