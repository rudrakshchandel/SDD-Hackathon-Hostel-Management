import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.hostelId || !body.name) {
    return NextResponse.json(
      { error: "hostelId and name are required" },
      { status: 400 }
    );
  }

  await prisma.block.create({
    data: {
      hostelId: String(body.hostelId),
      name: String(body.name),
      description: body.description ? String(body.description) : null
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel }, { status: 201 });
}
