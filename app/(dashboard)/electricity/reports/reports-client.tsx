"use client";

import { api } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";

export default function ElectricityReportsClient() {
  const roomReportQuery = useQuery({
    queryKey: ["electricity-report-room"],
    queryFn: () => api<any[]>("/api/reports/electricity/room")
  });

  const tenantReportQuery = useQuery({
    queryKey: ["electricity-report-tenant"],
    queryFn: () => api<any[]>("/api/reports/electricity/tenant")
  });

  const meterReportQuery = useQuery({
    queryKey: ["electricity-report-meter"],
    queryFn: () => api<any[]>("/api/reports/electricity/meter")
  });

  const monthlyReportQuery = useQuery({
    queryKey: ["electricity-report-monthly"],
    queryFn: () => api<any[]>("/api/reports/electricity/monthly")
  });

  const roomReport = roomReportQuery.data ?? [];
  const tenantReport = tenantReportQuery.data ?? [];
  const meterReport = meterReportQuery.data ?? [];
  const monthlyReport = monthlyReportQuery.data ?? [];

  return (
    <main className="page-enter mx-auto max-w-6xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Electricity Reports</h1>
        <p className="text-sm text-slate-600">
          Room consumption, tenant shares, meter history, and monthly summaries.
        </p>
      </header>

      <section className="glass-panel section-enter section-delay-2 p-4">
        <h2 className="text-lg font-medium">Room Consumption</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {roomReport.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    No room consumption data.
                  </td>
                </tr>
              ) : (
                roomReport.map((row) => (
                  <tr key={row.id} className="border-t border-white/40">
                    <td className="px-3 py-2">
                      {row.blockName} / Floor {row.floorNumber} / Room {row.roomNumber}
                    </td>
                    <td className="px-3 py-2">
                      {row.periodStart?.slice(0, 10)} - {row.periodEnd?.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{row.unitsConsumed}</td>
                    <td className="px-3 py-2">₹{Number(row.totalAmount).toFixed(2)}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel section-enter section-delay-3 p-4">
        <h2 className="text-lg font-medium">Tenant Share</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Resident</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Stay Days</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {tenantReport.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    No tenant electricity shares.
                  </td>
                </tr>
              ) : (
                tenantReport.map((row) => (
                  <tr key={row.id} className="border-t border-white/40">
                    <td className="px-3 py-2">{row.resident?.fullName}</td>
                    <td className="px-3 py-2">
                      {row.room?.floor?.block?.name} / Floor {row.room?.floor?.floorNumber} / Room {row.room?.roomNumber}
                    </td>
                    <td className="px-3 py-2">
                      {row.periodStart?.slice(0, 10)} - {row.periodEnd?.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{row.stayDays ?? "—"}</td>
                    <td className="px-3 py-2">{row.unitsConsumedShare ?? "—"}</td>
                    <td className="px-3 py-2">₹{Number(row.amount).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel section-enter section-delay-4 p-4">
        <h2 className="text-lg font-medium">Meter Reading History</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Meter</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {meterReport.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={5}>
                    No meter readings available.
                  </td>
                </tr>
              ) : (
                meterReport.map((row) => (
                  <tr key={row.id} className="border-t border-white/40">
                    <td className="px-3 py-2">{row.meterNumber}</td>
                    <td className="px-3 py-2">
                      {row.blockName} / Floor {row.floorNumber} / Room {row.roomNumber}
                    </td>
                    <td className="px-3 py-2">{row.readingDate?.slice(0, 10)}</td>
                    <td className="px-3 py-2">{row.unitsConsumed}</td>
                    <td className="px-3 py-2">{row.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel section-enter section-delay-5 p-4">
        <h2 className="text-lg font-medium">Monthly Summary</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Rooms Billed</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReport.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={4}>
                    No monthly summary data.
                  </td>
                </tr>
              ) : (
                monthlyReport.map((row) => (
                  <tr key={row.period} className="border-t border-white/40">
                    <td className="px-3 py-2">{row.period}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2">{row.units}</td>
                    <td className="px-3 py-2">₹{Number(row.amount).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
