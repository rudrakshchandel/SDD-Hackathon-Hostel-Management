"use client";

import { api } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/lib/toast-context";

const splitModes = [
  { value: "", label: "Auto" },
  { value: "EQUAL", label: "Equal" },
  { value: "STAY_DURATION", label: "Stay Duration" }
];

type RoomOption = {
  id: string;
  roomNumber: string;
  floor: { floorNumber: number };
  block: { name: string };
};

type Settings = {
  electricityType: "NO_ELECTRICITY" | "PREPAID" | "METER_BASED";
  electricityRatePerUnit: string | null;
  electricitySplitMode: "EQUAL" | "STAY_DURATION";
  billingCycle: "MONTHLY" | "CUSTOM";
  hostelId: string;
};

type BillRow = {
  id: string;
  roomId: string;
  roomNumber: string;
  floorNumber: number;
  blockName: string;
  periodStart: string;
  periodEnd: string;
  unitsConsumed: number;
  unitRate: number;
  totalAmount: number;
  status: string;
};

type BillDetail = {
  id: string;
  room: {
    roomNumber: string;
    floor: { floorNumber: number; block: { name: string } };
  };
  billingPeriodStart: string;
  billingPeriodEnd: string;
  unitsConsumed: number;
  unitRate: number;
  totalAmount: number;
  status: string;
  invoices: Array<{
    id: string;
    totalAmount: string;
    stayDays: number | null;
    splitMode: string | null;
    unitsConsumedShare: string | null;
    resident: { fullName: string; contact: string | null };
  }>;
};

export default function ElectricityBillsClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["electricity-settings"],
    queryFn: () => api<Settings>("/api/electricity/settings")
  });

  const roomsQuery = useQuery({
    queryKey: ["rooms-list"],
    queryFn: () => api<{ rooms: RoomOption[] }>("/api/rooms").then((res) => res.rooms)
  });

  const billsQuery = useQuery({
    queryKey: ["electricity-bills"],
    queryFn: () => api<BillRow[]>("/api/reports/electricity/room")
  });

  const detailsQuery = useQuery({
    queryKey: ["electricity-bill", selectedBillId],
    queryFn: () => api<BillDetail>(`/api/electricity/bills/${selectedBillId}`),
    enabled: Boolean(selectedBillId)
  });

  const generateMutation = useMutation({
    mutationFn: (payload: {
      roomId?: string;
      periodStart: string;
      periodEnd: string;
      splitMode?: string;
    }) => api("/api/electricity/bills/generate", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-bills"] });
      showToast("Bills generated", "success");
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: (billId: string) =>
      api(`/api/electricity/bills/${billId}/finalize`, "PATCH"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-bills"] });
      showToast("Bill finalized", "success");
    }
  });

  async function submitGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const scope = String(formData.get("scope"));
    const payload = {
      roomId: scope === "room" ? String(formData.get("roomId")) : undefined,
      periodStart: String(formData.get("periodStart")),
      periodEnd: String(formData.get("periodEnd")),
      splitMode: String(formData.get("splitMode")) || undefined
    };

    try {
      await generateMutation.mutateAsync(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate bills";
      showToast(message, "error");
    }
  }

  const rooms = roomsQuery.data ?? [];
  const bills = billsQuery.data ?? [];
  const details = detailsQuery.data ?? null;
  const settings = settingsQuery.data ?? null;
  const disabled = settings?.electricityType !== "METER_BASED";

  const roomOptions = useMemo(
    () =>
      rooms.map((room) => ({
        value: room.id,
        label: `${room.block.name} / Floor ${room.floor.floorNumber} / Room ${room.roomNumber}`
      })),
    [rooms]
  );

  return (
    <main className="page-enter mx-auto max-w-6xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Electricity Bills</h1>
        <p className="text-sm text-slate-600">
          Generate room bills and review tenant shares.
        </p>
      </header>

      {disabled ? (
        <section className="glass-panel section-enter section-delay-2 p-4">
          <p className="text-sm text-slate-600">
            Billing is disabled for this hostel. Switch electricity type to Meter Based.
          </p>
        </section>
      ) : null}

      <section className="glass-panel section-enter section-delay-2 p-4">
        <h2 className="text-lg font-medium">Generate Bills</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-5" onSubmit={submitGenerate}>
          <Select name="scope" defaultValue="room">
            <option value="room">Single Room</option>
            <option value="hostel">All Rooms</option>
          </Select>
          <Select name="roomId">
            <option value="">Select room</option>
            {roomOptions.map((room) => (
              <option key={room.value} value={room.value}>
                {room.label}
              </option>
            ))}
          </Select>
          <Input required name="periodStart" type="date" />
          <Input required name="periodEnd" type="date" />
          <Select name="splitMode" defaultValue="">
            {splitModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </Select>
          <button className="glass-btn-primary h-11 rounded-xl px-4 py-2 text-sm" type="submit">
            Generate
          </button>
        </form>
      </section>

      <section className="glass-panel section-enter section-delay-3 p-4">
        <h2 className="text-lg font-medium">Generated Bills</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={6}>
                    No bills yet.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => (
                  <tr key={bill.id} className="border-t border-white/40">
                    <td className="px-3 py-2">
                      {bill.blockName} / Floor {bill.floorNumber} / Room {bill.roomNumber}
                    </td>
                    <td className="px-3 py-2">
                      {bill.periodStart.slice(0, 10)} - {bill.periodEnd.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2">{bill.unitsConsumed}</td>
                    <td className="px-3 py-2">₹{bill.totalAmount.toFixed(2)}</td>
                    <td className="px-3 py-2">{bill.status}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        type="button"
                        className="glass-btn-secondary px-3 py-1 text-xs"
                        onClick={() => setSelectedBillId(bill.id)}
                      >
                        View
                      </button>
                      {bill.status !== "FINALIZED" ? (
                        <button
                          type="button"
                          className="glass-btn-primary px-3 py-1 text-xs"
                          onClick={() => finalizeMutation.mutate(bill.id)}
                        >
                          Finalize
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {details ? (
        <section className="glass-panel section-enter section-delay-4 p-4">
          <h2 className="text-lg font-medium">Bill Details</h2>
          <p className="text-sm text-slate-600">
            Room {details.room.floor.block.name} / Floor {details.room.floor.floorNumber} / Room {details.room.roomNumber}
          </p>
          <p className="text-sm text-slate-600">
            Period: {details.billingPeriodStart.slice(0, 10)} - {details.billingPeriodEnd.slice(0, 10)}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2">Resident</th>
                  <th className="px-3 py-2">Stay Days</th>
                  <th className="px-3 py-2">Split Mode</th>
                  <th className="px-3 py-2">Units</th>
                  <th className="px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {details.invoices.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-slate-500" colSpan={5}>
                      No tenant shares for this bill.
                    </td>
                  </tr>
                ) : (
                  details.invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-white/40">
                      <td className="px-3 py-2">{invoice.resident.fullName}</td>
                      <td className="px-3 py-2">{invoice.stayDays ?? "—"}</td>
                      <td className="px-3 py-2">{invoice.splitMode ?? "—"}</td>
                      <td className="px-3 py-2">{invoice.unitsConsumedShare ?? "—"}</td>
                      <td className="px-3 py-2">₹{Number(invoice.totalAmount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
