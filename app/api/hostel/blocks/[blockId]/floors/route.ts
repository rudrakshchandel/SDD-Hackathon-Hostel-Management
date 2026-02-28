import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";

export async function POST(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  const body = await request.json();
  const floorNumber = Number(body.floorNumber);
  if (!Number.isInteger(floorNumber)) {
    return NextResponse.json(
      { error: "floorNumber must be an integer" },
      { status: 400 }
    );
  }

  await prisma.floor.create({
    data: {
      blockId: params.blockId,
      floorNumber,
      label: body.label ? String(body.label) : null
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel }, { status: 201 });
}
