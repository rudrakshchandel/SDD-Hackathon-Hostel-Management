import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";

const SHARING_TYPES = ["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"] as const;
const GENDER_RESTRICTIONS = ["ANY", "MALE_ONLY", "FEMALE_ONLY"] as const;
const ROOM_STATUSES = ["ACTIVE", "MAINTENANCE", "INACTIVE"] as const;

export async function POST(
  request: Request,
  { params }: { params: { floorId: string } }
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
  const genderRestriction = GENDER_RESTRICTIONS.includes(
    body.genderRestriction
  )
    ? body.genderRestriction
    : "ANY";
  const status = ROOM_STATUSES.includes(body.status)
    ? body.status
    : "ACTIVE";

  await prisma.room.create({
    data: {
      floorId: params.floorId,
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

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel }, { status: 201 });
}
