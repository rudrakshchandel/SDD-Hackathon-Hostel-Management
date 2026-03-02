import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "UPI", "CHEQUE", "OTHER"] as const;

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export async function POST(
  request: Request,
  { params }: { params: { feeId: string } }
) {
  const feeId = params.feeId;
  const body = await request.json();
  const amount = Number(body.amount);
  const method = String(body.method || "");

  if (!feeId || !Number.isFinite(amount) || !method) {
    return NextResponse.json(
      { error: "feeId, amount, and method are required" },
      { status: 400 }
    );
  }

  if (!PAYMENT_METHODS.includes(method as (typeof PAYMENT_METHODS)[number])) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }

  const paymentMethod = method as (typeof PAYMENT_METHODS)[number];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await prisma.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: feeId },
        include: {
          payments: {
            where: { status: "COMPLETED" },
            select: { amount: true }
          }
        }
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: feeId,
          residentId: invoice.residentId,
          amount,
          method: paymentMethod,
          status: "COMPLETED",
          reference: body.reference ? String(body.reference) : null
        },
        select: {
          id: true,
          invoiceId: true,
          residentId: true,
          amount: true,
          method: true,
          status: true,
          reference: true,
          receivedAt: true
        }
      });

      const paidBefore = invoice.payments.reduce(
        (sum: number, entry: { amount: unknown }) => sum + toNumber(entry.amount),
        0
      );
      const paidAfter = paidBefore + toNumber(payment.amount);
      const invoiceTotal = toNumber(invoice.totalAmount);
      const dueAfter = Math.max(0, invoiceTotal - paidAfter);

      const nextStatus =
        dueAfter <= 0 ? "PAID" : paidAfter > 0 ? "PARTIALLY_PAID" : "ISSUED";

      await tx.invoice.update({
        where: { id: feeId },
        data: {
          status: nextStatus
        }
      });

      return {
        payment,
        invoice: {
          id: invoice.id,
          status: nextStatus,
          totalAmount: invoiceTotal,
          paidAmount: paidAfter,
          dueAmount: dueAfter
        }
      };
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment creation failed" },
      { status: 400 }
    );
  }
}
