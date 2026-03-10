import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const bills = await prisma.electricityBill.findMany({
    include: {
      room: {
        include: {
          floor: {
            include: {
              block: { select: { id: true, name: true } }
            }
          }
        }
      }
    },
    orderBy: { billingPeriodStart: "desc" },
    take: 500
  });

  const data = bills.map((bill) => ({
    id: bill.id,
    roomId: bill.roomId,
    roomNumber: bill.room.roomNumber,
    floorNumber: bill.room.floor.floorNumber,
    blockName: bill.room.floor.block.name,
    periodStart: bill.billingPeriodStart,
    periodEnd: bill.billingPeriodEnd,
    unitsConsumed: toNumber(bill.unitsConsumed),
    unitRate: toNumber(bill.unitRate),
    totalAmount: toNumber(bill.totalAmount),
    status: bill.status
  }));

  return Response.json({ data });
}
