import { prisma } from "@/lib/prisma";

type PersonFinancial = {
  residentId: string;
  name: string;
  contact: string | null;
  invoiced: number;
  paid: number;
  due: number;
  invoiceCount: number;
  unpaidInvoices: number;
};

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

function financialStatus(person: PersonFinancial) {
  if (person.due <= 0 && person.invoiceCount > 0) return "PAID";
  if (person.paid <= 0 && person.due > 0) return "UNPAID";
  if (person.due > 0) return "PARTIAL";
  return "NO_INVOICE";
}

function statusBadgeClass(status: ReturnType<typeof financialStatus>) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "UNPAID") return "bg-rose-100 text-rose-700 border-rose-200";
  if (status === "PARTIAL") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function summarizePeople(people: PersonFinancial[]) {
  return people.reduce(
    (acc, person) => {
      const status = financialStatus(person);
      acc.invoiced += person.invoiced;
      acc.paid += person.paid;
      acc.due += person.due;
      if (status === "PAID") acc.paidPeople += 1;
      if (status === "UNPAID") acc.unpaidPeople += 1;
      if (status === "PARTIAL") acc.partialPeople += 1;
      return acc;
    },
    {
      invoiced: 0,
      paid: 0,
      due: 0,
      paidPeople: 0,
      unpaidPeople: 0,
      partialPeople: 0
    }
  );
}

function personFromResident(
  resident: {
    id: string;
    fullName: string;
    contact: string | null;
    invoices: Array<{
      totalAmount: unknown;
      status: string;
      payments: Array<{ amount: unknown }>;
    }>;
  }
): PersonFinancial {
  let invoiced = 0;
  let paid = 0;
  let unpaidInvoices = 0;

  for (const invoice of resident.invoices) {
    const totalAmount = toNumber(invoice.totalAmount);
    const paidAmount = invoice.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
    invoiced += totalAmount;
    paid += paidAmount;
    const dueOnInvoice = Math.max(0, totalAmount - paidAmount);
    if (dueOnInvoice > 0 && invoice.status !== "CANCELLED") {
      unpaidInvoices += 1;
    }
  }

  return {
    residentId: resident.id,
    name: resident.fullName,
    contact: resident.contact,
    invoiced,
    paid,
    due: Math.max(0, invoiced - paid),
    invoiceCount: resident.invoices.length,
    unpaidInvoices
  };
}

function PersonRow({ person }: { person: PersonFinancial }) {
  const status = financialStatus(person);

  return (
    <div className="glass-card grid gap-2 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center">
      <div>
        <p className="font-medium text-slate-900">{person.name}</p>
        <p className="text-xs text-slate-500">
          {person.contact || "No contact"} | Invoices: {person.invoiceCount}
        </p>
      </div>
      <p className="text-sm text-slate-700">{formatCurrency(person.invoiced)}</p>
      <p className="text-sm text-emerald-700">{formatCurrency(person.paid)}</p>
      <p className="text-sm text-rose-700">{formatCurrency(person.due)}</p>
      <span
        className={`inline-flex w-fit items-center rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(
          status
        )}`}
      >
        {status}
      </span>
    </div>
  );
}

export default async function RevenuePage() {
  const hostels = await prisma.hostel.findMany({
    orderBy: { name: "asc" },
    include: {
      floors: {
        orderBy: { floorNumber: "asc" },
        include: {
          rooms: {
            orderBy: { roomNumber: "asc" },
            include: {
              beds: {
                include: {
                  allocations: {
                    where: {
                      status: "ACTIVE",
                      endDate: null
                    },
                    include: {
                      resident: {
                        include: {
                          invoices: {
                            where: {
                              status: { not: "CANCELLED" }
                            },
                            include: {
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
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  const allPeople: PersonFinancial[] = [];

  for (const hostel of hostels) {
    for (const floor of hostel.floors) {
      for (const room of floor.rooms) {
        const roomResidentsMap = new Map<string, PersonFinancial>();
        for (const bed of room.beds) {
          for (const allocation of bed.allocations) {
            const person = personFromResident(allocation.resident);
            if (!roomResidentsMap.has(person.residentId)) {
              roomResidentsMap.set(person.residentId, person);
            }
          }
        }
        allPeople.push(...roomResidentsMap.values());
      }
    }
  }

  const totalSummary = summarizePeople(allPeople);

  return (
    <main className="page-enter mx-auto max-w-7xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Revenue Ledger</h1>
        <p className="text-sm text-slate-600">
          Track paid vs unpaid residents across the full hostel hierarchy.
        </p>
        <div className="mt-3">
          <a
            href="/api/reports/fees"
            className="glass-btn-secondary inline-flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-medium"
          >
            Download Fees CSV
          </a>
        </div>
      </header>

      <section className="section-enter section-delay-2 grid gap-3 md:grid-cols-3">
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Total Invoiced</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {formatCurrency(totalSummary.invoiced)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Total Collected</p>
          <p className="mt-1 text-xl font-semibold text-emerald-700">
            {formatCurrency(totalSummary.paid)}
          </p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-slate-500">Total Due</p>
          <p className="mt-1 text-xl font-semibold text-rose-700">
            {formatCurrency(totalSummary.due)}
          </p>
        </div>
      </section>

      <section className="glass-panel section-enter section-delay-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="glass-chip">Paid: {totalSummary.paidPeople}</span>
          <span className="glass-chip">Unpaid: {totalSummary.unpaidPeople}</span>
          <span className="glass-chip">Partial: {totalSummary.partialPeople}</span>
        </div>
      </section>

      {hostels.length === 0 ? (
        <section className="glass-panel section-enter section-delay-4 p-6 text-sm text-slate-600">
          No hostel data found.
        </section>
      ) : (
        <section className="section-enter section-delay-4 space-y-4">
          {hostels.map((hostel) => {
            const hostelPeople: PersonFinancial[] = [];

            for (const floor of hostel.floors) {
              for (const room of floor.rooms) {
                const roomResidentsMap = new Map<string, PersonFinancial>();
                for (const bed of room.beds) {
                  for (const allocation of bed.allocations) {
                    const person = personFromResident(allocation.resident);
                    if (!roomResidentsMap.has(person.residentId)) {
                      roomResidentsMap.set(person.residentId, person);
                    }
                  }
                }
                hostelPeople.push(...roomResidentsMap.values());
              }
            }

            const hostelSummary = summarizePeople(hostelPeople);

            return (
              <article key={hostel.id} className="glass-panel p-4">
                <h2 className="text-lg font-semibold text-slate-900">{hostel.name}</h2>
                <p className="text-xs text-slate-500">
                  Hostel | Invoiced {formatCurrency(hostelSummary.invoiced)} | Collected{" "}
                  {formatCurrency(hostelSummary.paid)} | Due {formatCurrency(hostelSummary.due)}
                </p>

                <div className="mt-4 space-y-4">
                  {hostel.floors.map((floor) => {
                    const floorPeople: PersonFinancial[] = [];

                    for (const room of floor.rooms) {
                      const roomResidentsMap = new Map<string, PersonFinancial>();
                      for (const bed of room.beds) {
                        for (const allocation of bed.allocations) {
                          const person = personFromResident(allocation.resident);
                          if (!roomResidentsMap.has(person.residentId)) {
                            roomResidentsMap.set(person.residentId, person);
                          }
                        }
                      }
                      floorPeople.push(...roomResidentsMap.values());
                    }

                    const floorSummary = summarizePeople(floorPeople);

                    return (
                      <section key={floor.id} className="glass-card p-4">
                        <h4 className="font-medium text-slate-900">
                          Floor {floor.floorNumber}
                          {floor.label ? ` - ${floor.label}` : ""}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Floor | Invoiced {formatCurrency(floorSummary.invoiced)} | Collected{" "}
                          {formatCurrency(floorSummary.paid)} | Due{" "}
                          {formatCurrency(floorSummary.due)}
                        </p>

                        <div className="mt-3 space-y-3">
                          {floor.rooms.map((room) => {
                            const roomResidentsMap = new Map<string, PersonFinancial>();
                            for (const bed of room.beds) {
                              for (const allocation of bed.allocations) {
                                const person = personFromResident(allocation.resident);
                                if (!roomResidentsMap.has(person.residentId)) {
                                  roomResidentsMap.set(person.residentId, person);
                                }
                              }
                            }
                            const roomPeople = [...roomResidentsMap.values()];
                            const roomSummary = summarizePeople(roomPeople);

                            return (
                              <section
                                key={room.id}
                                className="rounded-xl border border-white/60 bg-white/45 p-3"
                              >
                                <h5 className="font-medium text-slate-900">
                                  Room {room.roomNumber}
                                </h5>
                                <p className="text-xs text-slate-500">
                                  Room | Invoiced {formatCurrency(roomSummary.invoiced)} | Collected{" "}
                                  {formatCurrency(roomSummary.paid)} | Due{" "}
                                  {formatCurrency(roomSummary.due)}
                                </p>

                                <div className="mt-3 space-y-2">
                                  {roomPeople.length === 0 ? (
                                    <div className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                                      No active resident in this room.
                                    </div>
                                  ) : (
                                    roomPeople.map((person) => (
                                      <PersonRow key={person.residentId} person={person} />
                                    ))
                                  )}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
