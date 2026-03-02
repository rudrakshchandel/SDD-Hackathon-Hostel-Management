import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPrismaInitializationError: vi.fn(),
  searchRooms: vi.fn(),
  prisma: {
    block: { findMany: vi.fn() },
    floor: { findMany: vi.fn() }
  }
}));

vi.mock("@/lib/prisma", () => ({
  getPrismaInitializationError: mocks.getPrismaInitializationError,
  prisma: mocks.prisma
}));

vi.mock("@/lib/rooms", () => ({
  searchRooms: mocks.searchRooms
}));

describe("/api/rooms GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPrismaInitializationError.mockReturnValue(null);
    mocks.searchRooms.mockResolvedValue([]);
    mocks.prisma.block.findMany.mockResolvedValue([]);
    mocks.prisma.floor.findMany.mockResolvedValue([]);
  });

  it("returns rooms and filter options on success", async () => {
    mocks.searchRooms.mockResolvedValue([
      { id: "room-1", roomNumber: "101", sharingType: "SINGLE" }
    ]);
    mocks.prisma.block.findMany.mockResolvedValue([
      { id: "block-b", name: "B" },
      { id: "block-a", name: "A" }
    ]);
    mocks.prisma.floor.findMany.mockResolvedValue([
      {
        id: "floor-2",
        floorNumber: 2,
        label: "Second",
        blockId: "block-a",
        block: { name: "A" }
      },
      {
        id: "floor-1",
        floorNumber: 1,
        label: "First",
        blockId: "block-a",
        block: { name: "A" }
      }
    ]);

    const { GET } = await import("@/app/api/rooms/route");
    const response = await GET(new Request("http://localhost/api/rooms"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.rooms).toHaveLength(1);
    expect(payload.data.filterOptions.blocks).toHaveLength(2);
    expect(payload.data.filterOptions.floors.map((f: { id: string }) => f.id)).toEqual([
      "floor-1",
      "floor-2"
    ]);
  });

  it("returns 500 when prisma client is not initialized", async () => {
    mocks.getPrismaInitializationError.mockReturnValue(new Error("not-ready"));

    const { GET } = await import("@/app/api/rooms/route");
    const response = await GET(new Request("http://localhost/api/rooms"));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toContain("Database client is not ready");
  });

  it("returns 400 for invalid price filter values", async () => {
    const { GET } = await import("@/app/api/rooms/route");
    const response = await GET(
      new Request("http://localhost/api/rooms?minPrice=abc&maxPrice=12000")
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("minPrice must be a valid number");
  });

  it("returns empty rooms list for empty-state queries", async () => {
    const { GET } = await import("@/app/api/rooms/route");
    const response = await GET(
      new Request("http://localhost/api/rooms?availability=vacant")
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.rooms).toEqual([]);
    expect(payload.data.filterOptions.blocks).toEqual([]);
    expect(payload.data.filterOptions.floors).toEqual([]);
  });
});
