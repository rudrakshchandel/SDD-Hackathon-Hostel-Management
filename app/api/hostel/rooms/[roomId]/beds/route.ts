import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";

const BED_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"] as const;

export async function POST(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const body = await request.json();
  if (!body.bedNumber) {
    return NextResponse.json(
      { error: "bedNumber is required" },
      { status: 400 }
    );
  }

  const status = BED_STATUSES.includes(body.status)
    ? body.status
    : "AVAILABLE";

  await prisma.bed.create({
    data: {
      roomId: params.roomId,
      bedNumber: String(body.bedNumber),
      status
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel }, { status: 201 });
}
