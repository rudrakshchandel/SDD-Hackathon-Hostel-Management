import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const COMPLAINT_STATUSES = ["OPEN", "IN_PROGRESS", "CLOSED"] as const;

export async function PATCH(
  request: Request,
  { params }: { params: { complaintId: string } }
) {
  const complaintId = params.complaintId;
  const body = await request.json();
  const status = body.status ? String(body.status) : null;

  if (!complaintId) {
    return NextResponse.json({ error: "complaintId is required" }, { status: 400 });
  }

  if (status && !COMPLAINT_STATUSES.includes(status as (typeof COMPLAINT_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid complaint status" }, { status: 400 });
  }

  const nextStatus = status
    ? (status as (typeof COMPLAINT_STATUSES)[number])
    : undefined;

  try {
    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: nextStatus,
        resolutionNotes:
          body.resolutionNotes !== undefined ? String(body.resolutionNotes) : undefined,
        closedById: body.closedById ? String(body.closedById) : undefined,
        closedAt: nextStatus === "CLOSED" ? new Date() : nextStatus ? null : undefined
      },
      select: {
        id: true,
        status: true,
        resolutionNotes: true,
        closedById: true,
        closedAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ data: complaint });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Complaint update failed" },
      { status: 400 }
    );
  }
}
