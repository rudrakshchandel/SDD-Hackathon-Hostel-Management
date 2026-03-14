import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree, hasActiveResidentsInRoom } from "@/lib/hostel";

const SHARING_TYPES = ["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"] as const;
const GENDER_RESTRICTIONS = ["ANY", "MALE_ONLY", "FEMALE_ONLY"] as const;
const ROOM_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;

export async function PUT(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const body = await request.json();
  if (!body.roomNumber || !body.sharingType) {
    return NextResponse.json(
      { error: "roomNumber and sharingType are required" },
      { status: 400 }
    );
  }

  const sharingType = SHARING_TYPES.includes(body.sharingType)
    ? body.sharingType
    : "SINGLE";
  const genderRestriction = GENDER_RESTRICTIONS.includes(body.genderRestriction)
    ? body.genderRestriction
    : "ANY";
  const status = ROOM_STATUSES.includes(body.status) ? body.status : "ACTIVE";

  await prisma.room.update({
    where: { id: params.roomId },
    data: {
      roomNumber: String(body.roomNumber),
      sharingType,
      genderRestriction,
      status,
      basePrice:
        body.basePrice === "" || body.basePrice === undefined
          ? null
          : Number(body.basePrice),
      attributes:
        body.attributes && typeof body.attributes === "object"
          ? body.attributes
          : null
    }
  });

  // Handle electricity meter separately
  if (body.electricityMeter) {
    const existing = await prisma.electricityMeter.findUnique({
      where: { roomId: params.roomId }
    });
    const meterData = {
      meterNumber: String(body.electricityMeter.meterNumber || body.roomNumber),
      installationDate: new Date(
        body.electricityMeter.installationDate || new Date()
      ),
      isActive: true
    };

    if (existing) {
      await prisma.electricityMeter.update({
        where: { roomId: params.roomId },
        data: meterData
      });
    } else {
      await prisma.electricityMeter.create({
        data: {
          roomId: params.roomId,
          ...meterData
        }
      });
    }
  } else if (body.electricityMeter === null) {
    // If explicitly null, remove meter tracking
    await prisma.electricityMeter.deleteMany({
      where: { roomId: params.roomId }
    });
  }

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}

export async function DELETE(
  _: Request,
  { params }: { params: { roomId: string } }
) {
  if (await hasActiveResidentsInRoom(params.roomId)) {
    return NextResponse.json(
      {
        error:
          "Cannot delete room with active residents. Vacate or transfer residents first."
      },
      { status: 409 }
    );
  }

  await prisma.room.delete({ where: { id: params.roomId } });
  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}
