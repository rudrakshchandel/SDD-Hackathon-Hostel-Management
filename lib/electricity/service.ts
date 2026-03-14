import { ElectricitySplitMode, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateOverlapDays } from "@/lib/electricity/date-utils";
import { calculateShares } from "@/lib/electricity/split";
import { calculatePeriodUnits, evaluateReading } from "@/lib/electricity/readings";
import { buildHostelRoomFilter } from "@/lib/electricity/room-filter";
import { randomUUID } from "crypto";

type ElectricitySettings = {
  hostelId: string;
  billingCycle: "MONTHLY" | "CUSTOM";
  electricityRatePerUnit: string | null;
  electricitySplitMode: "EQUAL" | "STAY_DURATION";
  electricityType: "NO_ELECTRICITY" | "PREPAID" | "METER_BASED";
};

type MeterReadingInput = {
  meterId: string;
  currentReading: number;
  readingDate: Date;
  notes?: string | null;
  createdBy?: string | null;
};

type GenerateBillInput = {
  roomId: string;
  periodStart: Date;
  periodEnd: Date;
  splitMode?: ElectricitySplitMode;
};

type ComputedShare = {
  residentId: string;
  allocationId: string | null;
  stayDays: number;
  amount: number;
  splitMode: ElectricitySplitMode;
};

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2).toString();
}

function ensurePeriodOrder(start: Date, end: Date) {
  if (start.getTime() > end.getTime()) {
    throw new Error("periodStart cannot be after periodEnd");
  }
}

async function getHostel() {
  const hostel = await prisma.hostel.findFirst({ orderBy: { createdAt: "asc" } });
  if (!hostel) throw new Error("Hostel not found");
  return hostel;
}

export async function getHostelElectricitySettings(): Promise<ElectricitySettings> {
  const hostel = await getHostel();
  return {
    hostelId: hostel.id,
    billingCycle: hostel.billingCycle,
    electricityRatePerUnit: hostel.electricityRatePerUnit?.toString() ?? null,
    electricitySplitMode: hostel.electricitySplitMode,
    electricityType: hostel.electricityType
  };
}

export async function updateHostelElectricitySettings(input: {
  electricityType?: ElectricitySettings["electricityType"];
  electricityRatePerUnit?: string | number | null;
  billingCycle?: ElectricitySettings["billingCycle"];
  electricitySplitMode?: ElectricitySettings["electricitySplitMode"];
}) {
  const hostel = await getHostel();

  return prisma.hostel.update({
    where: { id: hostel.id },
    data: {
      electricityType: input.electricityType ?? hostel.electricityType,
      electricityRatePerUnit:
        input.electricityRatePerUnit === undefined
          ? hostel.electricityRatePerUnit
          : input.electricityRatePerUnit === null
            ? null
            : new Prisma.Decimal(input.electricityRatePerUnit),
      billingCycle: input.billingCycle ?? hostel.billingCycle,
      electricitySplitMode: input.electricitySplitMode ?? hostel.electricitySplitMode
    }
  });
}

export async function assignMeterToRoom(input: {
  roomId: string;
  meterNumber: string;
  installationDate: Date;
  isActive?: boolean;
}) {
  const existing = await prisma.electricityMeter.findUnique({
    where: { roomId: input.roomId }
  });

  if (existing) {
    return prisma.electricityMeter.update({
      where: { id: existing.id },
      data: {
        meterNumber: input.meterNumber,
        installationDate: input.installationDate,
        isActive: input.isActive ?? true
      }
    });
  }

  return prisma.electricityMeter.create({
    data: {
      id: randomUUID(),
      roomId: input.roomId,
      meterNumber: input.meterNumber,
      installationDate: input.installationDate,
      isActive: input.isActive ?? true
    }
  });
}

export async function updateMeter(input: {
  meterId: string;
  meterNumber?: string;
  installationDate?: Date;
  isActive?: boolean;
}) {
  return prisma.electricityMeter.update({
    where: { id: input.meterId },
    data: {
      meterNumber: input.meterNumber,
      installationDate: input.installationDate,
      isActive: input.isActive
    }
  });
}

export async function recordMeterReading(input: MeterReadingInput) {
  const lastReading = await prisma.meterReading.findFirst({
    where: {
      meterId: input.meterId,
      status: { in: ["VALID", "CORRECTED"] }
    },
    orderBy: { readingDate: "desc" }
  });

  const previous = lastReading ? toNumber(lastReading.currentReading) : input.currentReading;
  const { status, units } = evaluateReading(input.currentReading, previous);
  const unitsConsumed = units ?? 0;

  return prisma.meterReading.create({
    data: {
      id: randomUUID(),
      meterId: input.meterId,
      readingDate: input.readingDate,
      previousReading: toMoney(previous),
      currentReading: toMoney(input.currentReading),
      unitsConsumed: toMoney(unitsConsumed),
      status,
      createdBy: input.createdBy ?? null,
      notes: input.notes ?? null
    }
  });
}

async function getRoomAllocations(roomId: string, periodStart: Date, periodEnd: Date) {
  return prisma.allocation.findMany({
    where: {
      bed: { roomId },
      status: { in: ["ACTIVE", "TRANSFERRED", "VACATED"] },
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }]
    },
    include: {
      resident: true
    }
  });
}

function pickSplitMode(stayDays: number[], fallback: ElectricitySplitMode) {
  if (stayDays.length <= 1) return "EQUAL";
  const first = stayDays[0];
  const allEqual = stayDays.every((days) => days === first);
  if (allEqual) return fallback === "STAY_DURATION" ? "EQUAL" : fallback;
  return "STAY_DURATION";
}

async function computeShares(input: {
  roomId: string;
  periodStart: Date;
  periodEnd: Date;
  totalAmount: number;
  splitModeFallback: ElectricitySplitMode;
}): Promise<ComputedShare[]> {
  const allocations = await getRoomAllocations(
    input.roomId,
    input.periodStart,
    input.periodEnd
  );

  if (allocations.length === 0) {
    return [];
  }

  const stayByResident = new Map<string, { stayDays: number; allocationId: string | null }>();

  for (const allocation of allocations) {
    const stayEnd = allocation.endDate ?? input.periodEnd;
    const stayDays = calculateOverlapDays(
      input.periodStart,
      input.periodEnd,
      allocation.startDate,
      stayEnd
    );

    if (stayDays <= 0) continue;

    const existing = stayByResident.get(allocation.residentId);
    if (existing) {
      existing.stayDays += stayDays;
    } else {
      stayByResident.set(allocation.residentId, {
        stayDays,
        allocationId: allocation.id
      });
    }
  }

  const residents = Array.from(stayByResident.entries());
  if (residents.length === 0) return [];

  const stayDaysList = residents.map(([, data]) => data.stayDays);
  const splitMode = pickSplitMode(stayDaysList, input.splitModeFallback);
  const amounts = calculateShares(input.totalAmount, stayDaysList);

  return residents.map(([residentId, data], index) => ({
    residentId,
    allocationId: data.allocationId,
    stayDays: data.stayDays,
    amount: amounts[index],
    splitMode
  }));
}

export async function generateRoomBill(input: GenerateBillInput) {
  ensurePeriodOrder(input.periodStart, input.periodEnd);
  const hostel = await getHostel();

  if (hostel.electricityType !== "METER_BASED") {
    throw new Error("Electricity billing is only available for meter-based hostels");
  }

  if (!hostel.electricityRatePerUnit) {
    throw new Error("Electricity rate per unit is not configured");
  }

  const existingBill = await prisma.electricityBill.findUnique({
    where: {
      roomId_billingPeriodStart_billingPeriodEnd: {
        roomId: input.roomId,
        billingPeriodStart: input.periodStart,
        billingPeriodEnd: input.periodEnd
      }
    }
  });

  if (existingBill && existingBill.status === "FINALIZED") {
    return { bill: existingBill, invoices: [] };
  }

  const meter = await prisma.electricityMeter.findUnique({
    where: { roomId: input.roomId }
  });

  if (!meter) {
    throw new Error("No electricity meter assigned to this room");
  }

  const readings = await prisma.meterReading.findMany({
    where: {
      meterId: meter.id,
      status: { in: ["VALID", "CORRECTED"] },
      readingDate: { lte: input.periodEnd }
    },
    orderBy: { readingDate: "asc" }
  });

  const unitsConsumed = calculatePeriodUnits(
    readings.map((reading) => ({
      readingDate: reading.readingDate,
      currentReading: toNumber(reading.currentReading),
      status: reading.status
    })),
    input.periodStart,
    input.periodEnd
  );

  const totalAmount = new Prisma.Decimal(unitsConsumed).mul(hostel.electricityRatePerUnit);
  const totalAmountNumber = totalAmount.toDecimalPlaces(2).toNumber();

  const bill = existingBill
    ? await prisma.electricityBill.update({
        where: { id: existingBill.id },
        data: {
          unitsConsumed,
          unitRate: hostel.electricityRatePerUnit,
          totalAmount: totalAmount.toDecimalPlaces(2)
        }
      })
    : await prisma.electricityBill.create({
        data: {
          id: randomUUID(),
          roomId: input.roomId,
          billingPeriodStart: input.periodStart,
          billingPeriodEnd: input.periodEnd,
          unitsConsumed: unitsConsumed,
          unitRate: hostel.electricityRatePerUnit,
          totalAmount: totalAmount.toDecimalPlaces(2)
        }
      });

  const shares = await computeShares({
    roomId: input.roomId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    totalAmount: totalAmountNumber,
    splitModeFallback: input.splitMode ?? hostel.electricitySplitMode
  });

  const residentIds = shares.map((share) => share.residentId);
  if (residentIds.length === 0) {
    await prisma.invoice.deleteMany({
      where: { sourceBillId: bill.id, type: "ELECTRICITY" }
    });
  } else {
    await prisma.invoice.deleteMany({
      where: {
        sourceBillId: bill.id,
        type: "ELECTRICITY",
        residentId: { notIn: residentIds }
      }
    });
  }

  const invoices = [];
  for (const share of shares) {
    const unitsShare =
      totalAmountNumber > 0
        ? Number(((unitsConsumed * share.amount) / totalAmountNumber).toFixed(2))
        : 0;

    const invoice = await prisma.invoice.upsert({
      where: {
        sourceBillId_residentId: {
          sourceBillId: bill.id,
          residentId: share.residentId
        }
      },
      update: {
        totalAmount: toMoney(share.amount),
        roomId: input.roomId,
        splitMode: share.splitMode,
        stayDays: share.stayDays,
        unitsConsumedShare: unitsShare
      },
      create: {
        residentId: share.residentId,
        allocationId: share.allocationId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        totalAmount: toMoney(share.amount),
        dueDate: input.periodEnd,
        status: "ISSUED",
        roomId: input.roomId,
        sourceBillId: bill.id,
        splitMode: share.splitMode,
        stayDays: share.stayDays,
        type: "ELECTRICITY",
        unitsConsumedShare: unitsShare
      }
    });

    invoices.push(invoice);
  }

  return { bill, invoices };
}

export async function generateHostelBills(input: {
  periodStart: Date;
  periodEnd: Date;
}) {
  ensurePeriodOrder(input.periodStart, input.periodEnd);
  const hostel = await getHostel();

  if (hostel.electricityType !== "METER_BASED") {
    throw new Error("Electricity billing is only available for meter-based hostels");
  }

  const rooms = await prisma.room.findMany({
    where: {
      floor: { hostelId: hostel.id }
    },
    select: { id: true }
  });

  const results = [];
  for (const room of rooms) {
    const result = await generateRoomBill({
      roomId: room.id,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd
    });
    results.push(result);
  }

  return results;
}
