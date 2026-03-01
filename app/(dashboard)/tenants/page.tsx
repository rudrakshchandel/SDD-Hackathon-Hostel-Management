import { prisma } from "@/lib/prisma";

function labelStatus(status: "ACTIVE" | "PENDING" | "VACATED") {
  if (status === "ACTIVE") return "Active";
  if (status === "PENDING") return "Pending";
  return "Vacated";
}

function statusClass(status: "ACTIVE" | "PENDING" | "VACATED") {
  if (status === "ACTIVE") {
    return "border-emerald-300/60 bg-emerald-100/70 text-emerald-800";
  }
  if (status === "PENDING") {
    return "border-amber-300/60 bg-amber-100/70 text-amber-800";
  }
  return "border-slate-300/60 bg-slate-100/70 text-slate-700";
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(value);
}

function formatDate(value: Date | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(value);
}

type ResidentStatus = "ACTIVE" | "PENDING" | "VACATED";

type ResidentRow = {
  id: string;
  fullName: string;
  gender: string;
  contact: string | null;
  status: ResidentStatus;
  rent: number | null;
  nearestDueDate: Date | null;
  allocationLabel: string;
};

export default async function TenantsPage() {
  const [residents, counts] = await Promise.all([
    prisma.resident.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        gender: true,
        contact: true,
        status: true,
        allocations: {
          where: {
            status: "ACTIVE"
          },
          select: {
            bed: {
              select: {
                bedNumber: true,
                room: {
                  select: {
                    roomNumber: true,
                    floor: {
                      select: {
                        floorNumber: true,
                        block: {
                          select: { name: true }
                        }
                      }
                    },
                    basePrice: true
                  }
                }
              }
            }
          },
          take: 1
        },
        invoices: {
          where: {
            status: {
              not: "CANCELLED"
            }
          },
          select: {
            totalAmount: true,
            dueDate: true,
            payments: {
              where: {
                status: "COMPLETED"
              },
              select: {
                amount: true
              }
            }
          }
        }
      },
      take: 300
    }),
    prisma.resident.groupBy({
      by: ["status"],
      _count: true
    })
  ]);

  const totals = {
    active: counts.find((c) => c.status === "ACTIVE")?._count ?? 0,
    pending: counts.find((c) => c.status === "PENDING")?._count ?? 0,
    vacated: counts.find((c) => c.status === "VACATED")?._count ?? 0
  };

  const residentRows: ResidentRow[] = residents.map((resident) => {
    const current = resident.allocations[0];
    const bed = current?.bed;
    const room = bed?.room;
    const floor = room?.floor;
    const rent = room?.basePrice ? toNumber(room.basePrice) : null;

    const pendingInvoices = resident.invoices
      .map((invoice) => {
        const invoiceTotal = toNumber(invoice.totalAmount);
        const paid = invoice.payments.reduce(
          (sum, payment) => sum + toNumber(payment.amount),
          0
        );
        const due = Math.max(0, invoiceTotal - paid);
        return {
          due,
          dueDate: invoice.dueDate
        };
      })
      .filter((invoice) => invoice.due > 0);

    const nearestDue = pendingInvoices.sort((a, b) => {
      const at = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bt = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      return at - bt;
    })[0];

    const allocationLabel =
      bed && room && floor
        ? `${floor.block.name} / Floor ${floor.floorNumber} / Room ${room.roomNumber} / Bed ${bed.bedNumber}`
        : "Not allocated";

    return {
      id: resident.id,
      fullName: resident.fullName,
      gender: resident.gender,
      contact: resident.contact,
      status: resident.status,
      rent,
      nearestDueDate: nearestDue?.dueDate ?? null,
      allocationLabel
    };
  });

  const sections: Array<{
    status: ResidentStatus;
    label: string;
    defaultOpen?: boolean;
    rows: ResidentRow[];
  }> = [
    {
      status: "ACTIVE",
      label: "Active Tenants",
      defaultOpen: true,
      rows: residentRows.filter((row) => row.status === "ACTIVE")
    },
    {
      status: "PENDING",
      label: "Pending Tenants",
      rows: residentRows.filter((row) => row.status === "PENDING")
    },
    {
      status: "VACATED",
      label: "Vacated Tenants",
      rows: residentRows.filter((row) => row.status === "VACATED")
    }
  ];

  return (
    <main className="page-enter mx-auto max-w-7xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Tenants</h1>
        <p className="text-sm text-slate-600">
          View resident records, current allocation, rent, and pending due date.
        </p>
      </header>

      <section className="section-enter section-delay-2 grid gap-3 sm:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Active</p>
          <p className="text-2xl font-semibold">{totals.active}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
          <p className="text-2xl font-semibold">{totals.pending}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Vacated</p>
          <p className="text-2xl font-semibold">{totals.vacated}</p>
        </div>
      </section>

      <section className="section-enter section-delay-3 space-y-4">
        {sections.map((section) => (
          <details
            key={section.status}
            open={section.defaultOpen}
            className="glass-panel overflow-hidden shadow-[0_24px_46px_-30px_rgba(15,23,42,0.5)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between border-b border-white/50 px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-medium">{section.label}</h2>
                <span className="glass-chip">{section.rows.length}</span>
              </div>
              <span
                className={`inline-flex rounded-full border px-2 py-1 text-xs ${statusClass(
                  section.status
                )}`}
              >
                {labelStatus(section.status)}
              </span>
            </summary>

            {section.rows.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">No tenants in this section.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Gender</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Hostel Rent</th>
                      <th className="px-4 py-3">Due Date</th>
                      <th className="px-4 py-3">Current Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((resident) => (
                      <tr key={resident.id} className="border-t border-white/40">
                        <td className="px-4 py-3 font-medium">{resident.fullName}</td>
                        <td className="px-4 py-3">{resident.gender}</td>
                        <td className="px-4 py-3">{resident.contact || "—"}</td>
                        <td className="px-4 py-3">
                          {resident.rent !== null ? formatCurrency(resident.rent) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {resident.nearestDueDate ? (
                            <span className="inline-flex rounded-full border border-rose-300/60 bg-rose-100/70 px-2 py-1 text-xs font-medium text-rose-700">
                              {formatDate(resident.nearestDueDate)}
                            </span>
                          ) : (
                            <span className="text-slate-500">No pending due</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{resident.allocationLabel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        ))}
      </section>
    </main>
  );
}
