import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("/api/fees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.invoice.findMany.mockResolvedValue([]);
    mocks.prisma.invoice.create.mockResolvedValue({
      id: "inv-1",
      residentId: "resident-1",
      periodStart: new Date("2026-03-01"),
      periodEnd: new Date("2026-03-31"),
      totalAmount: 12000,
      dueDate: new Date("2026-03-10"),
      status: "ISSUED",
      createdAt: new Date("2026-03-01")
    });
  });

  it("GET returns fee rows", async () => {
    mocks.prisma.invoice.findMany.mockResolvedValueOnce([
      {
        id: "inv-1",
        resident: { id: "resident-1", fullName: "Aman", contact: "9999999999" },
        periodStart: new Date("2026-03-01"),
        periodEnd: new Date("2026-03-31"),
        dueDate: new Date("2026-03-10"),
        status: "ISSUED",
        totalAmount: 12000,
        payments: [{ amount: 5000 }],
        createdAt: new Date("2026-03-01")
      }
    ]);

    const { GET } = await import("@/app/api/fees/route");
    const response = await GET(new Request("http://localhost/api/fees"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].dueAmount).toBe(7000);
  });

  it("POST validates required fields", async () => {
    const { POST } = await import("@/app/api/fees/route");
    const response = await POST(
      new Request("http://localhost/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: "resident-1" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("required");
  });
});

describe("/api/fees/[feeId]/payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST validates method", async () => {
    const { POST } = await import("@/app/api/fees/[feeId]/payments/route");
    const response = await POST(
      new Request("http://localhost/api/fees/inv-1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 1000, method: "INVALID" })
      }),
      { params: { feeId: "inv-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid");
  });

  it("POST creates payment and returns updated fee status", async () => {
    mocks.prisma.$transaction.mockImplementationOnce(async (callback: Function) => {
      const tx = {
        invoice: {
          findUnique: vi.fn().mockResolvedValue({
            id: "inv-1",
            residentId: "resident-1",
            totalAmount: 10000,
            payments: [{ amount: 3000 }]
          }),
          update: vi.fn().mockResolvedValue({})
        },
        payment: {
          create: vi.fn().mockResolvedValue({
            id: "pay-1",
            invoiceId: "inv-1",
            residentId: "resident-1",
            amount: 4000,
            method: "UPI",
            status: "COMPLETED",
            reference: null,
            receivedAt: new Date("2026-03-03")
          })
        }
      };
      return callback(tx);
    });

    const { POST } = await import("@/app/api/fees/[feeId]/payments/route");
    const response = await POST(
      new Request("http://localhost/api/fees/inv-1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 4000, method: "UPI" })
      }),
      { params: { feeId: "inv-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data.payment.id).toBe("pay-1");
    expect(payload.data.invoice.status).toBe("PARTIALLY_PAID");
  });
});

