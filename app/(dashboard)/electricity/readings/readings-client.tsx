"use client";

import { api } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/lib/toast-context";

const readingStatusLabels: Record<string, string> = {
  VALID: "Valid",
  RESET_REVIEW: "Reset Review",
  CORRECTED: "Corrected"
};

type RoomOption = {
  id: string;
  roomNumber: string;
  floor: { floorNumber: number };
};

type Meter = {
  id: string;
  meterNumber: string;
  installationDate: string;
  isActive: boolean;
  room: RoomOption;
};

type Reading = {
  id: string;
  readingDate: string;
  previousReading: string;
  currentReading: string;
  unitsConsumed: string;
  status: string;
  notes: string | null;
};

export default function ElectricityReadingsClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedMeterId, setSelectedMeterId] = useState<string>("");

  const roomsQuery = useQuery({
    queryKey: ["rooms-list"],
    queryFn: () =>
      api<{ rooms: RoomOption[] }>("/api/rooms").then((response) => response.rooms)
  });

  const metersQuery = useQuery({
    queryKey: ["electricity-meters"],
    queryFn: () => api<Meter[]>("/api/meters")
  });

  const readingsQuery = useQuery({
    queryKey: ["electricity-readings", selectedMeterId],
    queryFn: () => api<Reading[]>(`/api/electricity/readings?meterId=${selectedMeterId}`),
    enabled: Boolean(selectedMeterId)
  });

  const assignMutation = useMutation({
    mutationFn: (payload: {
      roomId: string;
      meterNumber: string;
      installationDate: string;
    }) => api<Meter>("/api/meters", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-meters"] });
      showToast("Meter assigned", "success");
    }
  });

  const readingMutation = useMutation({
    mutationFn: (payload: {
      meterId: string;
      currentReading: number;
      readingDate: string;
      notes?: string;
    }) => api<Reading>("/api/electricity/readings", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["electricity-readings"] });
      showToast("Reading recorded", "success");
    }
  });

  async function submitMeter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      roomId: String(formData.get("roomId")),
      meterNumber: String(formData.get("meterNumber")),
      installationDate: String(formData.get("installationDate"))
    };

    try {
      await assignMutation.mutateAsync(payload);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign meter";
      showToast(message, "error");
    }
  }

  async function submitReading(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      meterId: String(formData.get("meterId")),
      currentReading: Number(formData.get("currentReading")),
      readingDate: String(formData.get("readingDate")),
      notes: String(formData.get("notes") || "")
    };

    try {
      await readingMutation.mutateAsync(payload);
      event.currentTarget.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to record reading";
      showToast(message, "error");
    }
  }

  const meters = metersQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];
  const readings = readingsQuery.data ?? [];
  const selectedMeter = meters.find((meter) => meter.id === selectedMeterId) ?? null;
  const meterByRoom = useMemo(() => {
    const source = metersQuery.data ?? [];
    return new Map(source.map((meter) => [meter.room.id, meter]));
  }, [metersQuery.data]);

  return (
    <main className="page-enter mx-auto max-w-6xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Meter Readings</h1>
        <p className="text-sm text-slate-600">
          Assign meters to rooms and record readings.
        </p>
      </header>

      <section className="glass-panel section-enter section-delay-2 p-4">
        <h2 className="text-lg font-medium">Assign Meter</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-3" onSubmit={submitMeter}>
          <Select name="roomId" required>
            <option value="">Select room</option>
            {rooms.map((room) => {
              const meter = meterByRoom.get(room.id);
              const label = `Floor ${room.floor.floorNumber} / Room ${room.roomNumber}`;
              return (
                <option key={room.id} value={room.id}>
                  {label}
                </option>
              );
            })}
          </Select>
          <Input name="meterNumber" placeholder="Meter # (Optional)" />
          <Input required name="installationDate" type="date" />
          <button className="glass-btn-primary h-11 rounded-xl px-4 py-2 text-sm" type="submit">
            Assign Meter
          </button>
        </form>
      </section>

      <section className="glass-panel section-enter section-delay-3 p-4">
        <h2 className="text-lg font-medium">Record Reading</h2>
        <form className="mt-3 grid gap-3 md:grid-cols-4" onSubmit={submitReading}>
          <Select
            name="meterId"
            required
            onChange={(event) => setSelectedMeterId(event.target.value)}
            value={selectedMeterId}
          >
            <option value="">Select meter</option>
            {meters.map((meter) => (
              <option key={meter.id} value={meter.id}>
                Room {meter.room.roomNumber} (Floor {meter.room.floor.floorNumber})
              </option>
            ))}
          </Select>
          <Input required name="currentReading" type="number" step="0.01" placeholder="Current reading" />
          <Input required name="readingDate" type="date" />
          <Input name="notes" placeholder="Notes" />
          <button className="glass-btn-primary h-11 rounded-xl px-4 py-2 text-sm" type="submit">
            Save Reading
          </button>
        </form>
      </section>

      <section className="glass-panel section-enter section-delay-4 p-4">
        <h2 className="text-lg font-medium">Recent Readings</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-white/40 text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Room</th>
                <th className="px-3 py-2">Previous</th>
                <th className="px-3 py-2">Current</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {readings.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-slate-500" colSpan={7}>
                    {selectedMeterId ? "No readings yet for this meter." : "Select a meter to load readings."}
                  </td>
                </tr>
              ) : (
                readings.map((reading) => (
                  <tr key={reading.id} className="border-t border-white/40">
                    <td className="px-3 py-2">{reading.readingDate.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                       Room {selectedMeter?.room.roomNumber || "—"}
                    </td>
                    <td className="px-3 py-2">{reading.previousReading}</td>
                    <td className="px-3 py-2">{reading.currentReading}</td>
                    <td className="px-3 py-2">{reading.unitsConsumed}</td>
                    <td className="px-3 py-2">{readingStatusLabels[reading.status] || reading.status}</td>
                    <td className="px-3 py-2">{reading.notes || "—"}</td>
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
