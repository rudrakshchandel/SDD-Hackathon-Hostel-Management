import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree, hasActiveResidentsInFloor } from "@/lib/hostel";

export async function PUT(
  request: Request,
  { params }: { params: { floorId: string } }
) {
  const body = await request.json();
  const floorNumber = Number(body.floorNumber);
  if (!Number.isInteger(floorNumber)) {
    return NextResponse.json(
      { error: "floorNumber must be an integer" },
      { status: 400 }
    );
  }

  await prisma.floor.update({
    where: { id: params.floorId },
    data: {
      floorNumber,
      label: body.label ? String(body.label) : null
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}

export async function DELETE(
  _: Request,
  { params }: { params: { floorId: string } }
) {
  if (await hasActiveResidentsInFloor(params.floorId)) {
    return NextResponse.json(
      {
        error:
          "Cannot delete floor with active residents. Vacate or transfer residents first."
      },
      { status: 409 }
    );
  }

  await prisma.floor.delete({ where: { id: params.floorId } });
  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}
