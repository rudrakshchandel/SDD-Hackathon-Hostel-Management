import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getHostelTree } from "@/lib/hostel";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Get the single hostel (1 hostel = 1 block architecture)
    const hostel = await prisma.hostel.findFirst({
      orderBy: { createdAt: "asc" }
    });

    if (!hostel) {
      return NextResponse.json({ error: "No hostel found" }, { status: 404 });
    }

    await prisma.floor.create({
      data: {
        hostelId: hostel.id,
        floorNumber: Number(body.floorNumber),
        label: body.label || null
      }
    });

    const updatedHostel = await getHostelTree();
    return NextResponse.json({ data: updatedHostel });
  } catch (error) {
    console.error("Floor creation error:", error);
    return NextResponse.json(
      { error: "Failed to create floor" },
      { status: 500 }
    );
  }
}
