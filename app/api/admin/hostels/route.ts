import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hostels = await prisma.hostel.findMany({
    include: {
      admins: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: hostels });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, address, ownerId } = body;

  if (!name || !address) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const hostel = await prisma.hostel.create({
      data: {
        name,
        address,
        admins: ownerId ? {
          connect: { id: ownerId }
        } : undefined,
      },
      include: {
        admins: true
      }
    });

    return NextResponse.json({ data: hostel }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
