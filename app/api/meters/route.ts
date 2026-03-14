import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignMeterToRoom } from "@/lib/electricity/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get("roomId");

  const meters = await prisma.electricityMeter.findMany({
    where: roomId ? { roomId } : undefined,
    include: {
      room: {
        include: {
          floor: {
            select: { id: true, floorNumber: true, label: true }
          }
        }
      }
    },
    orderBy: { installationDate: "desc" }
  });

  return NextResponse.json({ data: meters });
}

export async function POST(request: Request) {
  const body = await request.json();
  const roomId = String(body.roomId || "");
  const meterNumber = String(body.meterNumber || "");
  const installationDate = body.installationDate ? new Date(body.installationDate) : null;

  if (!roomId || !meterNumber || !installationDate || Number.isNaN(installationDate.getTime())) {
    return NextResponse.json(
      { error: "roomId, meterNumber, and installationDate are required" },
      { status: 400 }
    );
  }

  const meter = await assignMeterToRoom({
    roomId,
    meterNumber,
    installationDate
  });

  return NextResponse.json({ data: meter }, { status: 201 });
}
