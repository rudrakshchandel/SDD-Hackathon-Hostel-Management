import { NextResponse } from "next/server";
import { getRoomDetail } from "@/lib/rooms";
import { getPrismaInitializationError } from "@/lib/prisma";

export async function GET(
  _: Request,
  { params }: { params: { roomId: string } }
) {
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
    const room = await getRoomDetail(params.roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ data: room });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load room details"
      },
      { status: 500 }
    );
  }
}
