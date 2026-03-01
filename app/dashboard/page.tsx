import DashboardCards from "../(dashboard)/dashboard-cards";
import { prisma } from "@/lib/prisma";
import TopNav from "@/app/components/top-nav";
import HomeAiAssistant from "./home-ai-assistant";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export default async function DashboardPage() {
  const [
    totalBeds,
    occupiedBedRows,
    invoiceAggregate,
    paymentAggregate,
    activeComplaints,
    pendingDuesCount
  ] = await Promise.all([
    prisma.bed.count(),
    prisma.allocation.findMany({
      where: {
        status: "ACTIVE",
        resident: { status: "ACTIVE" }
      },
      select: { bedId: true },
      distinct: ["bedId"]
    }),
    prisma.invoice.aggregate({
      _sum: { totalAmount: true }
    }),
    prisma.payment.aggregate({
      where: {
        status: "COMPLETED"
      },
      _sum: { amount: true }
    }),
    prisma.complaint.count({
      where: {
        status: {
          in: ["OPEN", "IN_PROGRESS"]
        }
      }
    }),
    prisma.invoice.count({
      where: {
        status: {
          in: ["DRAFT", "ISSUED", "PARTIALLY_PAID", "OVERDUE"]
        }
      }
    })
  ]);

  const occupiedBeds = occupiedBedRows.length;
  const vacantBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupiedPct = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;
  const vacantPct = totalBeds > 0 ? (vacantBeds / totalBeds) * 100 : 0;

  const invoiced = toNumber(invoiceAggregate._sum.totalAmount);
  const collected = toNumber(paymentAggregate._sum.amount);
  const dues = Math.max(0, invoiced - collected);

  const stats = {
    occupancy: {
      totalBeds,
      occupiedBeds,
      vacantBeds,
      occupiedPct,
      vacantPct
    },
    revenue: {
      invoiced,
      collected,
      dues
    },
    activeComplaints,
    pendingDuesCount
  };

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-6xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-slate-600">
            Live operational snapshot from hostel data.
          </p>
        </header>
        <HomeAiAssistant />
        <DashboardCards stats={stats} />
      </main>
    </>
  );
}
