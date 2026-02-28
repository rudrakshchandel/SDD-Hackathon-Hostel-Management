import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;

function genderAllowed(restriction: string, gender: string) {
  if (restriction === "ANY") return true;
  if (restriction === "MALE_ONLY") return gender === "MALE";
  if (restriction === "FEMALE_ONLY") return gender === "FEMALE";
  return false;
}

export async function POST(request: Request) {
  const body = await request.json();
  const bedId = String(body.bedId || "");
  if (!bedId) {
    return NextResponse.json({ error: "bedId is required" }, { status: 400 });
  }

  let residentPayload:
    | {
        id?: string;
        fullName?: string;
        gender?: string;
        contact?: string;
        email?: string;
      }
    | undefined = body.resident;

  if (!residentPayload && body.residentId) {
    residentPayload = { id: String(body.residentId) };
  }

  if (!residentPayload) {
    return NextResponse.json(
      { error: "resident or residentId is required" },
      { status: 400 }
    );
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await prisma.$transaction(async (tx: any) => {
      const bed = await tx.bed.findUnique({
        where: { id: bedId },
        include: {
          room: true
        }
      });

      if (!bed) {
        throw new Error("Bed not found");
      }
      if (bed.room.status !== "ACTIVE") {
        throw new Error("Cannot allocate bed in a non-active room");
      }
      if (bed.status === "MAINTENANCE") {
        throw new Error("Cannot allocate a bed under maintenance");
      }

      const activeOnBed = await tx.allocation.findFirst({
        where: {
          bedId,
          status: "ACTIVE",
          resident: {
            status: "ACTIVE"
          }
        },
        select: { id: true }
      });

      if (activeOnBed) {
        throw new Error("Selected bed is already occupied");
      }

      let resident;
      if (residentPayload.id) {
        resident = await tx.resident.findUnique({
          where: { id: residentPayload.id }
        });
        if (!resident) {
          throw new Error("Resident not found");
        }
      } else {
        if (!residentPayload.fullName || !residentPayload.gender) {
          throw new Error("Resident fullName and gender are required");
        }
        if (!GENDERS.includes(residentPayload.gender as (typeof GENDERS)[number])) {
          throw new Error("Invalid resident gender");
        }
        resident = await tx.resident.create({
          data: {
            fullName: String(residentPayload.fullName),
            gender: residentPayload.gender,
            contact: residentPayload.contact ? String(residentPayload.contact) : null,
            email: residentPayload.email ? String(residentPayload.email) : null,
            status: "ACTIVE"
          }
        });
      }

      if (!genderAllowed(bed.room.genderRestriction, resident.gender)) {
        throw new Error("Resident gender does not match room gender restriction");
      }

      const residentActiveAllocation = await tx.allocation.findFirst({
        where: {
          residentId: resident.id,
          status: "ACTIVE"
        },
        select: { id: true }
      });
      if (residentActiveAllocation) {
        throw new Error("Resident already has an active allocation");
      }

      const allocation = await tx.allocation.create({
        data: {
          residentId: resident.id,
          bedId,
          startDate: new Date(),
          status: "ACTIVE"
        }
      });

      await tx.resident.update({
        where: { id: resident.id },
        data: {
          status: "ACTIVE"
        }
      });

      await tx.bed.update({
        where: { id: bedId },
        data: { status: "OCCUPIED" }
      });

      return {
        allocationId: allocation.id,
        resident: {
          id: resident.id,
          fullName: resident.fullName,
          gender: resident.gender
        },
        bed: {
          id: bed.id,
          bedNumber: bed.bedNumber,
          roomId: bed.roomId
        }
      };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Allocation failed"
      },
      { status: 400 }
    );
  }
}
