import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { searchRooms } from "@/lib/rooms";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rooms = await searchRooms(url.searchParams);

  const [blocks, floors] = await Promise.all([
    prisma.block.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    }),
    prisma.floor.findMany({
      orderBy: [{ floorNumber: "asc" }],
      select: {
        id: true,
        floorNumber: true,
        label: true,
        blockId: true,
        block: {
          select: { name: true }
        }
      }
    })
  ]);

  const sortedFloors = floors.sort(
    (
      a: { block: { name: string }; floorNumber: number },
      b: { block: { name: string }; floorNumber: number }
    ) => {
      const blockCmp = a.block.name.localeCompare(b.block.name);
      if (blockCmp !== 0) return blockCmp;
      return a.floorNumber - b.floorNumber;
    }
  );

  return NextResponse.json({
    data: {
      rooms,
      filterOptions: {
        blocks,
        floors: sortedFloors
      }
    }
  });
}
