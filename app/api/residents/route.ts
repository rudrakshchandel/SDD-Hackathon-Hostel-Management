import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
const RESIDENT_STATUSES = ["ACTIVE", "PENDING", "VACATED"] as const;

export async function GET() {
  const residents = await prisma.resident.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      gender: true,
      contact: true,
      status: true
    },
    take: 200
  });

  return NextResponse.json({ data: residents });
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.fullName || !body.gender) {
    return NextResponse.json(
      { error: "fullName and gender are required" },
      { status: 400 }
    );
  }

  if (!GENDERS.includes(body.gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const resident = await prisma.resident.create({
    data: {
      fullName: String(body.fullName),
      gender: body.gender,
      contact: body.contact ? String(body.contact) : null,
      email: body.email ? String(body.email) : null,
      status:
        body.status && RESIDENT_STATUSES.includes(body.status)
          ? body.status
          : "PENDING"
    },
    select: {
      id: true,
      fullName: true,
      gender: true,
      contact: true,
      email: true,
      status: true
    }
  });

  return NextResponse.json({ data: resident }, { status: 201 });
}
