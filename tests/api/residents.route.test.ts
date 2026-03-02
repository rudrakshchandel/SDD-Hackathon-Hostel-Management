import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrismaInitializationError: vi.fn(),
  prisma: {
    resident: {
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaInitializationError: mocks.getPrismaInitializationError,
  prisma: mocks.prisma
}));

describe("/api/residents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrismaInitializationError.mockReturnValue(null);
    mocks.prisma.resident.findMany.mockResolvedValue([]);
    mocks.prisma.resident.create.mockResolvedValue({
      id: "resident-1",
      fullName: "Rahul",
      gender: "MALE",
      contact: "9999999999",
      email: "rahul@example.com",
      status: "PENDING"
    });
  });

  it("GET returns resident list on success", async () => {
    mocks.prisma.resident.findMany.mockResolvedValue([
      {
        id: "resident-1",
        fullName: "Rahul",
        gender: "MALE",
        contact: "9999999999",
        status: "ACTIVE"
      }
    ]);

    const { GET } = await import("@/app/api/residents/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].fullName).toBe("Rahul");
  });

  it("POST returns 400 for missing required fields", async () => {
    const { POST } = await import("@/app/api/residents/route");
    const response = await POST(
      new Request("http://localhost/api/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gender: "MALE" })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("fullName and gender are required");
  });

  it("GET returns an empty list when no residents exist", async () => {
    const { GET } = await import("@/app/api/residents/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([]);
  });
});

