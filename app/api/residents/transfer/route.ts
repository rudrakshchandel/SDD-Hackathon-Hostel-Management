import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function genderAllowed(restriction: string, gender: string) {
  if (restriction === "ANY") return true;
  if (restriction === "MALE_ONLY") return gender === "MALE";
  if (restriction === "FEMALE_ONLY") return gender === "FEMALE";
  return false;
}

export async function POST(request: Request) {
  const body = await request.json();
  const residentId = String(body.residentId || "");
  const targetBedId = String(body.targetBedId || "");

  if (!residentId || !targetBedId) {
    return NextResponse.json(
      { error: "residentId and targetBedId are required" },
      { status: 400 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const resident = await tx.resident.findUnique({ where: { id: residentId } });
      if (!resident) {
        throw new Error("Resident not found");
      }

      const activeAllocation = await tx.allocation.findFirst({
        where: { residentId, status: "ACTIVE" },
        include: {
          bed: {
            include: {
              room: true
            }
          }
        }
      });

      if (!activeAllocation) {
        throw new Error("Resident does not have an active allocation");
      }

      if (activeAllocation.bedId === targetBedId) {
        throw new Error("Resident is already allocated to the selected bed");
      }

      const targetBed = await tx.bed.findUnique({
        where: { id: targetBedId },
        include: {
          room: true
        }
      });

      if (!targetBed) {
        throw new Error("Target bed not found");
      }

      if (targetBed.room.status !== "ACTIVE") {
        throw new Error("Cannot transfer to a bed in a non-active room");
      }

      if (targetBed.status === "MAINTENANCE") {
        throw new Error("Cannot transfer to a bed under maintenance");
      }

      if (!genderAllowed(targetBed.room.genderRestriction, resident.gender)) {
        throw new Error("Resident gender does not match target room restriction");
      }

      const existingTargetAllocation = await tx.allocation.findFirst({
        where: {
          bedId: targetBedId,
          status: "ACTIVE",
          resident: { status: "ACTIVE" }
        },
        select: { id: true }
      });

      if (existingTargetAllocation) {
        throw new Error("Target bed is already occupied");
      }

      const now = new Date();

      await tx.allocation.update({
        where: { id: activeAllocation.id },
        data: {
          status: "TRANSFERRED",
          endDate: now
        }
      });

      await tx.bed.update({
        where: { id: activeAllocation.bedId },
        data: { status: "AVAILABLE" }
      });

      const newAllocation = await tx.allocation.create({
        data: {
          residentId,
          bedId: targetBedId,
          startDate: now,
          status: "ACTIVE",
          notes: "Transferred from another bed"
        }
      });

      await tx.bed.update({
        where: { id: targetBedId },
        data: { status: "OCCUPIED" }
      });

      await tx.resident.update({
        where: { id: residentId },
        data: { status: "ACTIVE" }
      });

      return {
        residentId,
        fromBedId: activeAllocation.bedId,
        toBedId: targetBedId,
        allocationId: newAllocation.id,
        transferredAt: now.toISOString()
      };
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Transfer failed" },
      { status: 400 }
    );
  }
}

