import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "CANCELLED"
] as const;

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "").toUpperCase();

  const invoices = await prisma.invoice.findMany({
    where: status && INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])
      ? { status: status as (typeof INVOICE_STATUSES)[number] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      resident: {
        select: {
          id: true,
          fullName: true,
          contact: true
        }
      },
      payments: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          receivedAt: true
        }
      }
    },
    take: 300
  });

  const data = invoices.map((invoice) => {
    const total = toNumber(invoice.totalAmount);
    const paid = invoice.payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    return {
      id: invoice.id,
      resident: invoice.resident,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      dueDate: invoice.dueDate,
      status: invoice.status,
      totalAmount: total,
      paidAmount: paid,
      dueAmount: Math.max(0, total - paid),
      createdAt: invoice.createdAt
    };
  });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json();
  const residentId = String(body.residentId || "");
  const periodStart = body.periodStart ? new Date(body.periodStart) : null;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : null;
  const totalAmount = Number(body.totalAmount);

  if (!residentId || !periodStart || !periodEnd || !Number.isFinite(totalAmount)) {
    return NextResponse.json(
      { error: "residentId, periodStart, periodEnd, and totalAmount are required" },
      { status: 400 }
    );
  }

  if (periodStart.getTime() > periodEnd.getTime()) {
    return NextResponse.json(
      { error: "periodStart cannot be after periodEnd" },
      { status: 400 }
    );
  }

  const status =
    body.status && INVOICE_STATUSES.includes(body.status)
      ? (body.status as (typeof INVOICE_STATUSES)[number])
      : "ISSUED";

  const invoice = await prisma.invoice.create({
    data: {
      residentId,
      periodStart,
      periodEnd,
      totalAmount,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status
    },
    select: {
      id: true,
      residentId: true,
      periodStart: true,
      periodEnd: true,
      totalAmount: true,
      dueDate: true,
      status: true,
      createdAt: true
    }
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}
