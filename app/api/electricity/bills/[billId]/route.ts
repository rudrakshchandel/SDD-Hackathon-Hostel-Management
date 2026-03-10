import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(
  _request: Request,
  { params }: { params: { billId: string } }
) {
  const bill = await prisma.electricityBill.findUnique({
    where: { id: params.billId },
    include: {
      room: {
        include: {
          floor: {
            include: {
              block: { select: { id: true, name: true } }
            }
          }
        }
      },
      invoices: {
        where: { type: "ELECTRICITY" },
        include: {
          resident: { select: { id: true, fullName: true, contact: true } }
        }
      }
    }
  });

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const data = {
    ...bill,
    unitsConsumed: toNumber(bill.unitsConsumed),
    unitRate: toNumber(bill.unitRate),
    totalAmount: toNumber(bill.totalAmount)
  };

  return NextResponse.json({ data });
}
