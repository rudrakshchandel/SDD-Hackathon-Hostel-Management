import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordMeterReading } from "@/lib/electricity/service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const meterId = url.searchParams.get("meterId");

  if (!meterId) {
    return NextResponse.json({ error: "meterId is required" }, { status: 400 });
  }

  const readings = await prisma.meterReading.findMany({
    where: { meterId },
    orderBy: { readingDate: "desc" }
  });

  return NextResponse.json({ data: readings });
}

export async function POST(request: Request) {
  const body = await request.json();
  const meterId = String(body.meterId || "");
  const currentReading = Number(body.currentReading);
  const readingDate = body.readingDate ? new Date(body.readingDate) : null;

  if (!meterId || !Number.isFinite(currentReading) || !readingDate) {
    return NextResponse.json(
      { error: "meterId, currentReading, and readingDate are required" },
      { status: 400 }
    );
  }

  if (Number.isNaN(readingDate.getTime())) {
    return NextResponse.json({ error: "Invalid readingDate" }, { status: 400 });
  }

  const reading = await recordMeterReading({
    meterId,
    currentReading,
    readingDate,
    notes: body.notes ? String(body.notes) : null,
    createdBy: body.createdBy ? String(body.createdBy) : null
  });

  return NextResponse.json({ data: reading }, { status: 201 });
}
