import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateReading } from "@/lib/electricity/readings";

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
  const previous = await prisma.meterReading.findFirst({
    where: {
      meterId: existing.meterId,
      status: { in: ["VALID", "CORRECTED"] },
      readingDate: { lt: effectiveDate }
    },
    orderBy: { readingDate: "desc" }
  });

  const previousValue = previous ? toNumber(previous.currentReading) : currentReading;
  const evaluation = evaluateReading(currentReading, previousValue);

  const status = evaluation.status === "VALID" ? "CORRECTED" : evaluation.status;
  const unitsConsumed = evaluation.units ?? 0;

  const reading = await prisma.meterReading.update({
    where: { id: existing.id },
    data: {
      readingDate: effectiveDate,
      previousReading: toMoney(previousValue),
      currentReading: toMoney(currentReading),
      unitsConsumed: toMoney(unitsConsumed),
      status,
      notes: body.notes ? String(body.notes) : existing.notes
    }
  });

  return NextResponse.json({ data: reading });
}
