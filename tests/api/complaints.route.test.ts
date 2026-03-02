import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    complaint: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("/api/complaints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.complaint.findMany.mockResolvedValue([]);
    mocks.prisma.complaint.create.mockResolvedValue({
      id: "cmp-1",
      residentId: "resident-1",
      hostelId: "hostel-1",
      roomId: null,
      category: "MAINTENANCE",
      title: "Fan issue",
      description: "Fan not working",
      status: "OPEN",
      createdAt: new Date("2026-03-01")
    });
  });

  it("GET returns complaint list", async () => {
    mocks.prisma.complaint.findMany.mockResolvedValueOnce([
      { id: "cmp-1", status: "OPEN" }
    ]);

    const { GET } = await import("@/app/api/complaints/route");
    const response = await GET(new Request("http://localhost/api/complaints"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
  });

  it("POST validates category", async () => {
    const { POST } = await import("@/app/api/complaints/route");
    const response = await POST(
      new Request("http://localhost/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          residentId: "resident-1",
          hostelId: "hostel-1",
          category: "INVALID",
          description: "test"
        })
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid complaint category");
  });
});

describe("/api/complaints/[complaintId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.complaint.update.mockResolvedValue({
      id: "cmp-1",
      status: "CLOSED",
      resolutionNotes: "Resolved",
      closedById: null,
      closedAt: new Date("2026-03-03"),
      updatedAt: new Date("2026-03-03")
    });
  });

  it("PATCH validates status", async () => {
    const { PATCH } = await import("@/app/api/complaints/[complaintId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/complaints/cmp-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "INVALID" })
      }),
      { params: { complaintId: "cmp-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid complaint status");
  });

  it("PATCH updates complaint", async () => {
    const { PATCH } = await import("@/app/api/complaints/[complaintId]/route");
    const response = await PATCH(
      new Request("http://localhost/api/complaints/cmp-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED", resolutionNotes: "Resolved" })
      }),
      { params: { complaintId: "cmp-1" } }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("CLOSED");
  });
});

