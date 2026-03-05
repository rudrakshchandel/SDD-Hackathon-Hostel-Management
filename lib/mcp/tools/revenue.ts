import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { toNumber } from "@/lib/mcp/tools/result";

export const revenueSummaryInputSchema = z.object({
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional()
});

function toDateBounds(periodStart?: string, periodEnd?: string) {
  const start = periodStart ? new Date(periodStart) : undefined;
  const end = periodEnd ? new Date(periodEnd) : undefined;
  return { start, end };
}

export async function getRevenueSummaryForMcp(
  rawInput: z.input<typeof revenueSummaryInputSchema>
) {
  const input = revenueSummaryInputSchema.parse(rawInput);
  const { start, end } = toDateBounds(input.periodStart, input.periodEnd);

  const invoices = await prisma.invoice.findMany({
    where:
      start || end
        ? {
            AND: [
              ...(start ? [{ periodEnd: { gte: start } }] : []),
              ...(end ? [{ periodStart: { lte: end } }] : [])
            ]
          }
        : undefined,
    select: {
      id: true,
      totalAmount: true,
      status: true,
      dueDate: true,
      payments: {
        where: {
          status: "COMPLETED",
          ...(start || end
            ? {
                receivedAt: {
                  ...(start ? { gte: start } : {}),
                  ...(end ? { lte: end } : {})
                }
              }
            : {})
        },
        select: {
          amount: true,
          status: true
        }
      }
    }
  });

  const invoiced = invoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0);
  const collected = invoices.reduce(
    (sum, invoice) =>
      sum +
      invoice.payments.reduce((paymentTotal, payment) => paymentTotal + toNumber(payment.amount), 0),
    0
  );

  const now = new Date();
  const overdueInvoices = invoices.filter(
    (invoice) =>
      ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status) &&
      Boolean(invoice.dueDate && invoice.dueDate < now)
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    period: {
      periodStart: input.periodStart || null,
      periodEnd: input.periodEnd || null
    },
    invoices: invoices.length,
    invoiced,
    collected,
    dues: Math.max(0, invoiced - collected),
    overdueInvoices
  };
}
