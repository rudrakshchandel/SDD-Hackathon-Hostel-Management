import { NextResponse } from "next/server";
import { getPrismaInitializationError, prisma } from "@/lib/prisma";
import { searchRooms } from "@/lib/rooms";

export async function GET(request: Request) {
  if (getPrismaInitializationError()) {
    return NextResponse.json(
      {
        error:
          'Database client is not ready. Run "npx prisma generate" and ensure DATABASE_URL is configured.'
      },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const minPriceParam = url.searchParams.get("minPrice");
    const maxPriceParam = url.searchParams.get("maxPrice");

    if (minPriceParam && Number.isNaN(Number(minPriceParam))) {
      return NextResponse.json(
        { error: "minPrice must be a valid number" },
        { status: 400 }
      );
    }

    if (maxPriceParam && Number.isNaN(Number(maxPriceParam))) {
      return NextResponse.json(
        { error: "maxPrice must be a valid number" },
        { status: 400 }
      );
    }

    if (
      minPriceParam &&
      maxPriceParam &&
      Number(minPriceParam) > Number(maxPriceParam)
    ) {
      return NextResponse.json(
        { error: "minPrice cannot be greater than maxPrice" },
        { status: 400 }
      );
    }

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
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rooms data"
      },
      { status: 500 }
    );
  }
}
