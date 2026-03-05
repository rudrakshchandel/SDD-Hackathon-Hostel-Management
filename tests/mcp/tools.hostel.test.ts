import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    hostel: { findFirst: vi.fn() },
    block: { count: vi.fn() },
    floor: { count: vi.fn() },
    room: { count: vi.fn() },
    bed: { count: vi.fn() },
    allocation: { count: vi.fn() }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("mcp hostel summary tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.hostel.findFirst.mockResolvedValue({
      id: "hostel-1",
      name: "Shantiniketan Residency Hostel",
      address: "Bengaluru",
      contactNumber: "+91-0000000000",
      timezone: "Asia/Kolkata",
      status: "ACTIVE"
    });
    mocks.prisma.block.count.mockResolvedValue(2);
    mocks.prisma.floor.count.mockResolvedValue(4);
    mocks.prisma.room.count.mockResolvedValue(10);
    mocks.prisma.bed.count.mockResolvedValue(40);
    mocks.prisma.allocation.count.mockResolvedValue(30);
  });

  it("returns aggregated hostel counts", async () => {
    const { getHostelSummaryForMcp } = await import("@/lib/mcp/tools/hostel");
    const result = await getHostelSummaryForMcp();

    expect(result.hostel?.name).toContain("Shantiniketan");
    expect(result.counts.totalBeds).toBe(40);
    expect(result.counts.occupiedBeds).toBe(30);
    expect(result.counts.vacantBeds).toBe(10);
  });
});
