import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    room: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("mcp rooms tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searches rooms with clamped limit and returns summary rows", async () => {
    mocks.prisma.room.findMany.mockResolvedValue([
      {
        id: "room-1",
        roomNumber: "101",
        sharingType: "SINGLE",
        status: "ACTIVE",
        genderRestriction: "ANY",
        basePrice: 8500,
        attributes: { ac: true, smokingAllowed: false },
        floor: {
          floorNumber: 1,
          label: "First"
        },
        beds: [
          { id: "bed-1", status: "AVAILABLE", allocations: [] },
          { id: "bed-2", status: "OCCUPIED", allocations: [{ id: "alloc-1" }] }
        ]
      }
    ]);

    const { searchRoomsForMcp } = await import("@/lib/mcp/tools/rooms");
    const result = await searchRoomsForMcp(
      { ac: true, availability: "vacant", limit: 999 },
      25
    );

    expect(result.rooms).toHaveLength(1);
    expect(result.rooms[0].flags.ac).toBe(true);
    expect(result.rooms[0].vacancy.vacantBeds).toBe(1);

    expect(mocks.prisma.room.findMany).toHaveBeenCalledTimes(1);
    const [args] = mocks.prisma.room.findMany.mock.calls[0];
    expect(args.take).toBe(25);
  });

  it("builds vacancy summary by location", async () => {
    mocks.prisma.room.findMany.mockResolvedValue([
      {
        id: "room-1",
        roomNumber: "101",
        sharingType: "DOUBLE",
        status: "ACTIVE",
        genderRestriction: "ANY",
        basePrice: 10000,
        attributes: { ac: false, smokingAllowed: false },
        floor: {
          floorNumber: 1,
          label: "First"
        },
        beds: [
          { id: "bed-1", status: "AVAILABLE", allocations: [] },
          { id: "bed-2", status: "AVAILABLE", allocations: [] }
        ]
      }
    ]);

    const { getVacancyByLocationForMcp } = await import("@/lib/mcp/tools/rooms");
    const result = await getVacancyByLocationForMcp({ floor: 1 }, 50);

    expect(result.totals.totalBeds).toBe(2);
    expect(result.totals.vacantBeds).toBe(2);
    expect(result.rooms).toHaveLength(1);
  });
});
