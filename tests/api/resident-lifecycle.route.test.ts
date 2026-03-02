import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("/api/residents/transfer POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("@/app/api/residents/transfer/route");
    const response = await POST(
      new Request("http://localhost/api/residents/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: "resident-1" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("residentId and targetBedId are required");
  });

  it("transfers allocation successfully", async () => {
    mocks.prisma.$transaction.mockImplementationOnce(async (callback: Function) => {
      const tx = {
        resident: {
          findUnique: vi.fn().mockResolvedValue({
            id: "resident-1",
            gender: "MALE",
            status: "ACTIVE"
          }),
          update: vi.fn().mockResolvedValue({})
        },
        allocation: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce({
              id: "alloc-1",
              bedId: "bed-1",
              bed: { room: { status: "ACTIVE" } }
            })
            .mockResolvedValueOnce(null),
          update: vi.fn().mockResolvedValue({}),
          create: vi.fn().mockResolvedValue({ id: "alloc-2" })
        },
        bed: {
          findUnique: vi.fn().mockResolvedValue({
            id: "bed-2",
            status: "AVAILABLE",
            room: { status: "ACTIVE", genderRestriction: "ANY" }
          }),
          update: vi.fn().mockResolvedValue({})
        }
      };
      return callback(tx);
    });

    const { POST } = await import("@/app/api/residents/transfer/route");
    const response = await POST(
      new Request("http://localhost/api/residents/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ residentId: "resident-1", targetBedId: "bed-2" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.residentId).toBe("resident-1");
    expect(payload.data.fromBedId).toBe("bed-1");
    expect(payload.data.toBedId).toBe("bed-2");
  });
});

