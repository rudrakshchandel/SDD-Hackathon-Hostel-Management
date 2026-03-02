import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function escapeCsv(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      resident: {
        select: {
          fullName: true,
          contact: true
        }
      },
      payments: {
        where: { status: "COMPLETED" },
        select: { amount: true }
      }
    },
    take: 1000
  });

  const rows = [
    [
      "invoice_id",
      "resident_name",
      "resident_contact",
      "status",
      "period_start",
      "period_end",
      "due_date",
      "total_amount",
      "paid_amount",
      "due_amount"
    ]
  ];

  for (const invoice of invoices) {
    const total = toNumber(invoice.totalAmount);
    const paid = invoice.payments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0
    );
    rows.push([
      invoice.id,
      invoice.resident.fullName,
      invoice.resident.contact || "",
      invoice.status,
      invoice.periodStart.toISOString(),
      invoice.periodEnd.toISOString(),
      invoice.dueDate ? invoice.dueDate.toISOString() : "",
      total.toFixed(2),
      paid.toFixed(2),
      Math.max(0, total - paid).toFixed(2)
    ]);
  }

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fees-report.csv"'
    }
  });
}

