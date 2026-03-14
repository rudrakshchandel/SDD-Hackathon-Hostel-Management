import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateRoomBill } from "@/lib/electricity/service";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  prisma: {
    hostel: { findFirst: vi.fn() },
    electricityBill: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    electricityMeter: { findUnique: vi.fn() },
    meterReading: { findMany: vi.fn() },
    allocation: { findMany: vi.fn() },
    invoice: { deleteMany: vi.fn(), upsert: vi.fn() }
  }
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma
}));

describe("electricity-service: generateRoomBill", () => {
  const roomId = "room-1";
  const periodStart = new Date("2024-01-01");
  const periodEnd = new Date("2024-01-31");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if hostel is not meter-based", async () => {
    mocks.prisma.hostel.findFirst.mockResolvedValue({
      id: "h1",
      electricityType: "NO_ELECTRICITY"
    });

    await expect(
      generateRoomBill({ roomId, periodStart, periodEnd })
    ).rejects.toThrow(/only available for meter-based hostels/);
  });

  it("should generate a bill and invoices correctly", async () => {
    // 1. Mock Hostel Settings
    mocks.prisma.hostel.findFirst.mockResolvedValue({
      id: "h1",
      electricityType: "METER_BASED",
      electricityRatePerUnit: new Prisma.Decimal(10),
      electricitySplitMode: "EQUAL"
    });

    // 2. Mock Meter
    const meterId = "m1";
    mocks.prisma.electricityMeter.findUnique.mockResolvedValue({
      id: meterId,
      roomId
    });

    // 3. Mock Readings (Start: 100, End: 200 => 100 units)
    mocks.prisma.meterReading.findMany.mockResolvedValue([
      { readingDate: new Date("2023-12-31"), currentReading: new Prisma.Decimal(100), status: "VALID" },
      { readingDate: periodEnd, currentReading: new Prisma.Decimal(200), status: "VALID" }
    ]);

    // 4. Mock No Existing Bill
    mocks.prisma.electricityBill.findUnique.mockResolvedValue(null);
    mocks.prisma.electricityBill.create.mockResolvedValue({ id: "bill-1" });

    // 5. Mock Allocations (2 residents, full stay)
    mocks.prisma.allocation.findMany.mockResolvedValue([
      { id: "a1", residentId: "res-1", startDate: new Date("2023-01-01"), endDate: null },
      { id: "a2", residentId: "res-2", startDate: new Date("2023-01-01"), endDate: null }
    ]);

    // 6. Mock Invoice Upserts
    mocks.prisma.invoice.upsert.mockResolvedValue({ id: "inv-mock" });

    const result = await generateRoomBill({ roomId, periodStart, periodEnd });

    // Verify units: 100 units * 10 rate = 1000 total
    // Verify shares: 2 residents equal = 500 each
    expect(mocks.prisma.electricityBill.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitsConsumed: 100,
          totalAmount: new Prisma.Decimal(1000)
        })
      })
    );

    expect(mocks.prisma.invoice.upsert).toHaveBeenCalledTimes(2);
    // Check first resident's share
    expect(mocks.prisma.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          residentId: "res-1",
          totalAmount: "500"
        })
      })
    );
  });

  it("should split by stay duration when configured", async () => {
    // 1. Mock Hostel Settings
    mocks.prisma.hostel.findFirst.mockResolvedValue({
      id: "h1",
      electricityType: "METER_BASED",
      electricityRatePerUnit: new Prisma.Decimal(10),
      electricitySplitMode: "STAY_DURATION"
    });

    // 2. Mock Meter
    mocks.prisma.electricityMeter.findUnique.mockResolvedValue({ id: "m1", roomId });

    // 3. Mock Readings (100 units)
    mocks.prisma.meterReading.findMany.mockResolvedValue([
      { readingDate: new Date("2023-12-31"), currentReading: new Prisma.Decimal(0), status: "VALID" },
      { readingDate: periodEnd, currentReading: new Prisma.Decimal(100), status: "VALID" }
    ]);

    // 4. Mock No Existing Bill
    mocks.prisma.electricityBill.findUnique.mockResolvedValue(null);
    mocks.prisma.electricityBill.create.mockResolvedValue({ id: "bill-1" });

    // 5. Mock Allocations
    // res-1: full 31 days
    // res-2: only last 10 days (Jan 22 to Jan 31)
    mocks.prisma.allocation.findMany.mockResolvedValue([
      { id: "a1", residentId: "res-1", startDate: new Date("2023-01-01"), endDate: null },
      { id: "a2", residentId: "res-2", startDate: new Date("2024-01-22"), endDate: null }
    ]);

    mocks.prisma.invoice.upsert.mockResolvedValue({ id: "inv-mock" });

    await generateRoomBill({ roomId, periodStart, periodEnd });

    // Total days = 31 + 10 = 41
    // Total amount = 100 * 10 = 1000
    // Res-1 share = (1000 * 31) / 41 = 756.09 (approx)
    // Res-2 share = (1000 * 10) / 41 = 243.90 (approx)
    
    expect(mocks.prisma.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          residentId: "res-1",
          totalAmount: "756.09"
        })
      })
    );
  });
});
