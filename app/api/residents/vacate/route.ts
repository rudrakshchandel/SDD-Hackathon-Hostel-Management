import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const body = await request.json();
  const residentId = String(body.residentId || "");

  if (!residentId) {
    return NextResponse.json({ error: "residentId is required" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const resident = await tx.resident.findUnique({
        where: { id: residentId }
      });

      if (!resident) {
        throw new Error("Resident not found");
      }

      const activeAllocation = await tx.allocation.findFirst({
        where: { residentId, status: "ACTIVE" },
        select: { id: true, bedId: true }
      });

      if (!activeAllocation) {
        throw new Error("Resident does not have an active allocation");
      }

      const now = new Date();

      await tx.allocation.update({
        where: { id: activeAllocation.id },
        data: {
          status: "VACATED",
          endDate: now
        }
      });

      await tx.bed.update({
        where: { id: activeAllocation.bedId },
        data: { status: "AVAILABLE" }
      });

      await tx.resident.update({
        where: { id: residentId },
        data: { status: "VACATED" }
      });

      return {
        residentId,
        bedId: activeAllocation.bedId,
        vacatedAt: now.toISOString()
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Vacate failed" },
      { status: 400 }
    );
  }
}
