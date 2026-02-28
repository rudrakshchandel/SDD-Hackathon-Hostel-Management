import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree, hasActiveResidentsInBlock } from "@/lib/hostel";

export async function PUT(
  request: Request,
  { params }: { params: { blockId: string } }
) {
  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  await prisma.block.update({
    where: { id: params.blockId },
    data: {
      name: String(body.name),
      description: body.description ? String(body.description) : null
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}

export async function DELETE(
  _: Request,
  { params }: { params: { blockId: string } }
) {
  if (await hasActiveResidentsInBlock(params.blockId)) {
    return NextResponse.json(
      {
        error:
          "Cannot delete block with active residents. Vacate or transfer residents first."
      },
      { status: 409 }
    );
  }

  await prisma.block.delete({ where: { id: params.blockId } });
  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}
