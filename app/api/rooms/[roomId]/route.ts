import { NextResponse } from "next/server";
import { getRoomDetail } from "@/lib/rooms";

export async function GET(
  _: Request,
  { params }: { params: { roomId: string } }
) {
  const room = await getRoomDetail(params.roomId);
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json({ data: room });
}
