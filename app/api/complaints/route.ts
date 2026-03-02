import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COMPLAINT_CATEGORIES = [
  "MAINTENANCE",
  "CLEANLINESS",
  "ELECTRICITY",
  "WATER",
  "SECURITY",
  "BEHAVIORAL",
  "OTHER"
] as const;

const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "").toUpperCase();

  const complaints = await prisma.complaint.findMany({
    where: status && COMPLAINT_STATUSES.includes(status as (typeof COMPLAINT_STATUSES)[number])
      ? { status: status as (typeof COMPLAINT_STATUSES)[number] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      resident: {
        select: {
          id: true,
          fullName: true,
          contact: true
        }
      },
      hostel: {
        select: {
          id: true,
          name: true
        }
      },
      room: {
        select: {
          id: true,
          roomNumber: true
        }
      }
    },
    take: 300
  });

  return NextResponse.json({ data: complaints });
}

export async function POST(request: Request) {
  const body = await request.json();
  const residentId = String(body.residentId || "");
  const hostelId = String(body.hostelId || "");
  const description = String(body.description || "");
  const category = String(body.category || "");

  if (!residentId || !hostelId || !description || !category) {
    return NextResponse.json(
      { error: "residentId, hostelId, category, and description are required" },
      { status: 400 }
    );
  }

  if (!COMPLAINT_CATEGORIES.includes(category as (typeof COMPLAINT_CATEGORIES)[number])) {
    return NextResponse.json({ error: "Invalid complaint category" }, { status: 400 });
  }

  const complaintCategory = category as (typeof COMPLAINT_CATEGORIES)[number];

  const complaint = await prisma.complaint.create({
    data: {
      residentId,
      hostelId,
      roomId: body.roomId ? String(body.roomId) : null,
      category: complaintCategory,
      title: body.title ? String(body.title) : null,
      description,
      status: "OPEN"
    },
    select: {
      id: true,
      residentId: true,
      hostelId: true,
      roomId: true,
      category: true,
      title: true,
      description: true,
      status: true,
      createdAt: true
    }
  });

  return NextResponse.json({ data: complaint }, { status: 201 });
}
