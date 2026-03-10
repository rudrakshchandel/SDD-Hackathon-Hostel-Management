import { describe, expect, it } from "vitest";
import { buildHostelRoomFilter } from "@/lib/electricity/room-filter";

describe("buildHostelRoomFilter", () => {
  it("scopes active rooms to a hostel id", () => {
    const filter = buildHostelRoomFilter("hostel-1");
    expect(filter).toEqual({
      status: "ACTIVE",
      floor: { block: { hostelId: "hostel-1" } }
    });
  });
});
