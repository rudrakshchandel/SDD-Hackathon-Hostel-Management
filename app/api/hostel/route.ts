import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHostelTree } from "@/lib/hostel";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const HOSTEL_STATUSES = ["ACTIVE", "INACTIVE"] as const;
const ELECTRICITY_TYPES = ["NO_ELECTRICITY", "PREPAID", "METER_BASED"] as const;
const BILLING_CYCLES = ["MONTHLY", "CUSTOM"] as const;
const SPLIT_MODES = ["EQUAL", "STAY_DURATION"] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const hostel = await getHostelTree(userId);
  return NextResponse.json({ data: hostel });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const existing = await prisma.hostel.findFirst({ 
    where: { 
      admins: {
        some: { id: userId }
      }
    },
    select: { id: true } 
  });
  if (existing) {
    return NextResponse.json(
      { error: "Hostel already exists for this admin group. Use update instead." },
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
      admins: {
        connect: [{ id: userId }]
      },
      name: String(body.name),
      address: String(body.address),
      // ... rest of the fields
      contactNumber: body.contactNumber ? String(body.contactNumber) : null,
      timezone: body.timezone ? String(body.timezone) : null,
      status:
        body.status && HOSTEL_STATUSES.includes(body.status)
          ? body.status
          : "ACTIVE",
      electricityType:
        body.electricityType && ELECTRICITY_TYPES.includes(body.electricityType)
          ? body.electricityType
          : "NO_ELECTRICITY",
      electricityRatePerUnit: body.electricityRatePerUnit
        ? Number(body.electricityRatePerUnit)
        : null,
      billingCycle:
        body.billingCycle && BILLING_CYCLES.includes(body.billingCycle)
          ? body.billingCycle
          : "MONTHLY",
      electricitySplitMode:
        body.electricitySplitMode && SPLIT_MODES.includes(body.electricitySplitMode)
          ? body.electricitySplitMode
          : "STAY_DURATION"
    }
  });

  const hostel = await getHostelTree(userId);
  return NextResponse.json({ data: hostel }, { status: 201 });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;

  const existing = await prisma.hostel.findFirst({ 
    where: { 
      admins: {
        some: { id: userId }
      }
    },
    select: { id: true } 
  });
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
          : undefined,
      electricityType:
        body.electricityType && ELECTRICITY_TYPES.includes(body.electricityType)
          ? body.electricityType
          : undefined,
      electricityRatePerUnit: body.electricityRatePerUnit !== undefined
        ? (body.electricityRatePerUnit === null || body.electricityRatePerUnit === "" ? null : Number(body.electricityRatePerUnit))
        : undefined,
      billingCycle:
        body.billingCycle && BILLING_CYCLES.includes(body.billingCycle)
          ? body.billingCycle
          : undefined,
      electricitySplitMode:
        body.electricitySplitMode && SPLIT_MODES.includes(body.electricitySplitMode)
          ? body.electricitySplitMode
          : undefined
    }
  });

  const hostel = await getHostelTree(userId);
  return NextResponse.json({ data: hostel });
}
