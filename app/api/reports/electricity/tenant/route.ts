import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    where: { type: "ELECTRICITY" },
    include: {
      resident: { select: { id: true, fullName: true, contact: true } },
      room: {
        select: {
          id: true,
          roomNumber: true,
          floor: {
            select: {
              floorNumber: true,
              block: { select: { id: true, name: true } }
            }
          }
        }
      }
    },
    orderBy: { periodStart: "desc" },
    take: 500
  });

  const data = invoices.map((invoice) => ({
    id: invoice.id,
    resident: invoice.resident,
    room: invoice.room,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    amount: toNumber(invoice.totalAmount),
    stayDays: invoice.stayDays ?? null,
    splitMode: invoice.splitMode ?? null,
    unitsConsumedShare: toNumber(invoice.unitsConsumedShare),
    status: invoice.status
  }));

  return Response.json({ data });
}
