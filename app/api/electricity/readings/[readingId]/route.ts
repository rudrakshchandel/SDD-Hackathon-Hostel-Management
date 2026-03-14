import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recomputeReadingChain } from "@/lib/electricity/readings";

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toString();
}

export async function PATCH(
  request: Request,
  { params }: { params: { readingId: string } }
) {
  const body = await request.json();
  const currentReading = Number(body.currentReading);
  const readingDate = body.readingDate ? new Date(body.readingDate) : undefined;

  if (!Number.isFinite(currentReading)) {
    return NextResponse.json({ error: "currentReading is required" }, { status: 400 });
  }

  if (readingDate && Number.isNaN(readingDate.getTime())) {
    return NextResponse.json({ error: "Invalid readingDate" }, { status: 400 });
  }

  const existing = await prisma.meterReading.findUnique({
    where: { id: params.readingId }
  });

  if (!existing) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  const effectiveDate = readingDate ?? existing.readingDate;
  const recomputeStart =
    effectiveDate.getTime() < existing.readingDate.getTime()
      ? effectiveDate
      : existing.readingDate;

  const previous = await prisma.meterReading.findFirst({
    where: {
      meterId: existing.meterId,
      status: { in: ["VALID", "CORRECTED"] },
      readingDate: { lt: recomputeStart }
    },
    orderBy: { readingDate: "desc" }
  });

  const previousValue = previous ? toNumber(previous.currentReading) : currentReading;

  const subsequentReadings = await prisma.meterReading.findMany({
    where: {
      meterId: existing.meterId,
      readingDate: { gte: recomputeStart }
    },
    orderBy: { readingDate: "asc" }
  });

  const readings = subsequentReadings.map((reading) => ({
    id: reading.id,
    readingDate: reading.id === existing.id ? effectiveDate : reading.readingDate,
    currentReading:
      reading.id === existing.id ? currentReading : toNumber(reading.currentReading)
  }));

  const chain = recomputeReadingChain({
    previousReading: previousValue,
    readings,
    correctedId: existing.id
  });

  const readingMap = new Map(
    readings.map((reading) => [reading.id, reading] as const)
  );

  const updates = chain.map((item) => {
    const source = readingMap.get(item.id)!;

    return prisma.meterReading.update({
      where: { id: item.id },
      data: {
        readingDate: item.id === existing.id ? effectiveDate : undefined,
        previousReading: toMoney(item.previousReading),
        currentReading: toMoney(source.currentReading),
        unitsConsumed: toMoney(item.unitsConsumed),
        status: item.status,
        notes: item.id === existing.id ? (body.notes ? String(body.notes) : existing.notes) : undefined
      }
    });
  });

  const updated = await prisma.$transaction(updates);

  const corrected = updated.find((reading) => reading.id === existing.id);
  return NextResponse.json({ data: corrected ?? updated[0] });
}
