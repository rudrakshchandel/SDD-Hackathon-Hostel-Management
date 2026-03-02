import { NextResponse } from "next/server";
import { getPrismaInitializationError, prisma } from "@/lib/prisma";

type Period = "all" | "month";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function GET(request: Request) {
  if (getPrismaInitializationError()) {
    return NextResponse.json(
      {
        error:
          'Database client is not ready. Run "npx prisma generate" and ensure DATABASE_URL is configured.'
      },
      { status: 500 }
    );
  }

  try {
    const url = new URL(request.url);
    const periodParam = (url.searchParams.get("period") || "all").toLowerCase();

    if (periodParam !== "all" && periodParam !== "month") {
      return NextResponse.json(
        { error: "period must be one of: all, month" },
        { status: 400 }
      );
    }

    const period = periodParam as Period;
    const createdAtFilter =
      period === "month" ? { gte: firstDayOfMonth() } : undefined;

    const [invoiceAgg, paymentAgg, pendingInvoices] = await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: createdAtFilter ? { createdAt: createdAtFilter } : undefined
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: "COMPLETED",
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
        }
      }),
      prisma.invoice.count({
        where: {
          status: { in: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
          ...(createdAtFilter ? { createdAt: createdAtFilter } : {})
        }
      })
    ]);

    const invoiced = toNumber(invoiceAgg._sum.totalAmount);
    const collected = toNumber(paymentAgg._sum.amount);
    const outstanding = Math.max(0, invoiced - collected);

    return NextResponse.json({
      data: {
        period,
        invoiced,
        collected,
        outstanding,
        pendingInvoices
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load revenue summary"
      },
      { status: 500 }
    );
  }
}
