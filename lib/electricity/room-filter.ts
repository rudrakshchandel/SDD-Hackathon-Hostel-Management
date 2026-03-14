import { Prisma } from "@prisma/client";

export function buildHostelRoomFilter(hostelId: string): Prisma.RoomWhereInput {
  return {
    floor: {
      hostelId: hostelId
    }
  };
}
