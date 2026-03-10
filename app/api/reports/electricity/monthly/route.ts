import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const bills = await prisma.electricityBill.findMany({
    orderBy: { billingPeriodStart: "desc" },
    take: 500
  });

  const summary = new Map<string, { period: string; units: number; amount: number; count: number }>();

  for (const bill of bills) {
    const key = monthKey(bill.billingPeriodStart);
    const existing = summary.get(key) || {
      period: key,
      units: 0,
      amount: 0,
      count: 0
    };
    existing.units += toNumber(bill.unitsConsumed);
    existing.amount += toNumber(bill.totalAmount);
    existing.count += 1;
    summary.set(key, existing);
  }

  const data = Array.from(summary.values()).sort((a, b) =>
    a.period < b.period ? 1 : -1
  );

  return Response.json({ data });
}
