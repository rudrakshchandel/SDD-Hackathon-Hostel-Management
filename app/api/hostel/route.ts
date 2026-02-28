import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";

const HOSTEL_STATUSES = ["ACTIVE", "INACTIVE"] as const;

export async function GET() {
  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}

export async function POST(request: Request) {
  const existing = await prisma.hostel.findFirst({ select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { error: "Hostel already exists. Use update instead." },
      { status: 409 }
    );
  }

  const body = await request.json();
  if (!body.name || !body.address) {
    return NextResponse.json(
      { error: "name and address are required" },
      { status: 400 }
    );
  }

  await prisma.hostel.create({
    data: {
      name: String(body.name),
      address: String(body.address),
      contactNumber: body.contactNumber ? String(body.contactNumber) : null,
      timezone: body.timezone ? String(body.timezone) : null,
      status:
        body.status && HOSTEL_STATUSES.includes(body.status)
          ? body.status
          : "ACTIVE"
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel }, { status: 201 });
}

export async function PUT(request: Request) {
  const existing = await prisma.hostel.findFirst({ select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "Hostel not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.name || !body.address) {
    return NextResponse.json(
      { error: "name and address are required" },
      { status: 400 }
    );
  }

  await prisma.hostel.update({
    where: { id: existing.id },
    data: {
      name: String(body.name),
      address: String(body.address),
      contactNumber: body.contactNumber ? String(body.contactNumber) : null,
      timezone: body.timezone ? String(body.timezone) : null,
      status:
        body.status && HOSTEL_STATUSES.includes(body.status)
          ? body.status
          : undefined
    }
  });

  const hostel = await getHostelTree();
  return NextResponse.json({ data: hostel });
}
