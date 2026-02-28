import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree, hasActiveResidentsInBed } from "@/lib/hostel";

const BED_STATUSES = ["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"] as const;

export async function PUT(
  request: Request,
  { params }: { params: { bedId: string } }
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

  await prisma.bed.update({
    where: { id: params.bedId },
    data: {
      bedNumber: String(body.bedNumber),
      status
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}

export async function DELETE(
  _: Request,
  { params }: { params: { bedId: string } }
) {
  if (await hasActiveResidentsInBed(params.bedId)) {
    return NextResponse.json(
      {
        error:
          "Cannot delete bed with active residents. Vacate or transfer residents first."
      },
      { status: 409 }
    );
  }

  await prisma.bed.delete({ where: { id: params.bedId } });
  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}
