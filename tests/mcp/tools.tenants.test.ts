import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    allocation: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("mcp tenants tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists tenants and masks personal fields", async () => {
    mocks.prisma.allocation.findMany.mockResolvedValue([
      {
        id: "alloc-1",
        status: "ACTIVE",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        resident: {
          id: "res-1",
          fullName: "John Resident",
          gender: "MALE",
          status: "ACTIVE",
          contact: "9876543210",
          email: "john@example.com",
          idProofType: "AADHAR",
          idProofNumber: "123456789012",
          invoices: [
            {
              dueDate: new Date("2026-03-15T00:00:00.000Z"),
              status: "ISSUED"
            }
          ]
        },
        bed: {
          id: "bed-1",
          bedNumber: "A",
          room: {
            roomNumber: "101",
            floor: {
              floorNumber: 1,
              block: { name: "A" }
            }
          }
        }
      }
    ]);

    const { listTenantsForMcp } = await import("@/lib/mcp/tools/tenants");
    const result = await listTenantsForMcp({ limit: 20 }, 100);

    expect(result.tenants).toHaveLength(1);
    expect(result.tenants[0].email).toContain("@example.com");
    expect(result.tenants[0].email).not.toBe("john@example.com");
    expect(result.tenants[0].contact).toBe("********10");
    expect(result.tenants[0].idProofNumber).not.toBe("123456789012");
  });
});
