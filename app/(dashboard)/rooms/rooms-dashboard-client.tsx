"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type RoomListItem = {
  id: string;
  roomNumber: string;
  sharingType: string;
  status: string;
  genderRestriction: string;
  basePrice: number | null;
  attributes: Record<string, unknown> | null;
  block: { id: string; name: string };
  floor: { id: string; floorNumber: number; label: string | null };
  counts: { totalBeds: number; occupiedBeds: number; vacantBeds: number };
  availableBeds: Array<{ id: string; bedNumber: string }>;
};

type RoomDetail = {
  id: string;
  roomNumber: string;
  sharingType: string;
  status: string;
  genderRestriction: string;
  basePrice: number | null;
  attributes: Record<string, unknown> | null;
  block: { id: string; name: string };
  floor: { id: string; floorNumber: number; label: string | null };
  counts: { totalBeds: number; occupiedBeds: number; vacantBeds: number };
  beds: Array<{
    id: string;
    bedNumber: string;
    status: string;
    occupied: boolean;
    occupants: Array<{
      allocationId: string;
      resident: {
        id: string;
        fullName: string;
        gender: string;
        status: string;
        contact: string | null;
      };
    }>;
  }>;
};

type Resident = {
  id: string;
  fullName: string;
  gender: string;
  contact: string | null;
  status: string;
};

type FilterOptions = {
  blocks: Array<{ id: string; name: string }>;
  floors: Array<{
    id: string;
    floorNumber: number;
    label: string | null;
    blockId: string;
    block: { name: string };
  }>;
};

type RoomsApiResponse = {
  rooms: RoomListItem[];
  filterOptions: FilterOptions;
};

type Filters = {
  sharingType: string;
  blockId: string;
  floorId: string;
  ac: string;
  smoking: string;
  gender: string;
  minPrice: string;
  maxPrice: string;
  availability: string;
};

const defaultFilters: Filters = {
  sharingType: "",
  blockId: "",
  floorId: "",
  ac: "any",
  smoking: "any",
  gender: "ANY",
  minPrice: "",
  maxPrice: "",
  availability: "vacant"
};

async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }
  return payload.data as T;
}

function filtersToQuery(filters: Filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export default function RoomsDashboardClient() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    blocks: [],
    floors: []
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<RoomDetail | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [allocatingBedId, setAllocatingBedId] = useState<string | null>(null);

  const loadRooms = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const query = filtersToQuery(filters);
      const data = await api<RoomsApiResponse>(`/api/rooms?${query}`);
      setRooms(data.rooms);
      setFilterOptions(data.filterOptions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filters]);

  const loadRoomDetail = useCallback(async (roomId: string, showError = true) => {
    try {
      const data = await api<RoomDetail>(`/api/rooms/${roomId}`);
      setSelectedRoom(data);
    } catch (err) {
      if (showError) {
        setError(err instanceof Error ? err.message : "Failed to load room");
      }
      setSelectedRoom(null);
    }
  }, []);

  const loadResidents = useCallback(async () => {
    try {
      const data = await api<Resident[]>("/api/residents");
      setResidents(data);
    } catch {
      setResidents([]);
    }
  }, []);

  useEffect(() => {
    void loadResidents();
  }, [loadResidents]);

  useEffect(() => {
    void loadRooms();
    const interval = setInterval(() => {
      void loadRooms(false);
      if (selectedRoomId) {
        void loadRoomDetail(selectedRoomId, false);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [loadRoomDetail, loadRooms, selectedRoomId]);

  async function allocate(
    bedId: string,
    payload: { residentId?: string; resident?: Record<string, string> }
  ) {
    setError(null);
    setMessage(null);
    setAllocatingBedId(bedId);
    try {
      await api("/api/residents/allocate", "POST", { bedId, ...payload });
      setMessage("Bed allocated successfully");
      await Promise.all([loadRooms(false), selectedRoomId ? loadRoomDetail(selectedRoomId, false) : Promise.resolve(), loadResidents()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Allocation failed");
    } finally {
      setAllocatingBedId(null);
    }
  }

  const visibleFloors = useMemo(
    () =>
      filterOptions.floors.filter((floor) =>
        filters.blockId ? floor.blockId === filters.blockId : true
      ),
    [filterOptions.floors, filters.blockId]
  );

  if (loading) {
    return <main className="p-6">Loading rooms...</main>;
  }

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Room Search & Allocation</h1>
        <p className="text-sm text-slate-600">
          Filter rooms, inspect occupants, and allocate beds in one click.
        </p>
      </header>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <section className="rounded border p-4">
        <h2 className="mb-3 text-lg font-medium">Filters</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
          <select
            className="rounded border px-3 py-2"
            value={filters.sharingType}
            onChange={(e) => setFilters((p) => ({ ...p, sharingType: e.target.value }))}
          >
            <option value="">Sharing Type (All)</option>
            <option value="SINGLE">SINGLE</option>
            <option value="DOUBLE">DOUBLE</option>
            <option value="TRIPLE">TRIPLE</option>
            <option value="DORMITORY">DORMITORY</option>
          </select>
          <select
            className="rounded border px-3 py-2"
            value={filters.blockId}
            onChange={(e) =>
              setFilters((p) => ({ ...p, blockId: e.target.value, floorId: "" }))
            }
          >
            <option value="">Block (All)</option>
            {filterOptions.blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            className="rounded border px-3 py-2"
            value={filters.floorId}
            onChange={(e) => setFilters((p) => ({ ...p, floorId: e.target.value }))}
          >
            <option value="">Floor (All)</option>
            {visibleFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.block.name} - Floor {f.floorNumber}
              </option>
            ))}
          </select>
          <select
            className="rounded border px-3 py-2"
            value={filters.ac}
            onChange={(e) => setFilters((p) => ({ ...p, ac: e.target.value }))}
          >
            <option value="any">AC/Non-AC (All)</option>
            <option value="true">AC</option>
            <option value="false">Non-AC</option>
          </select>
          <select
            className="rounded border px-3 py-2"
            value={filters.smoking}
            onChange={(e) => setFilters((p) => ({ ...p, smoking: e.target.value }))}
          >
            <option value="any">Smoking (All)</option>
            <option value="true">Smoking Allowed</option>
            <option value="false">No Smoking</option>
          </select>
          <select
            className="rounded border px-3 py-2"
            value={filters.gender}
            onChange={(e) => setFilters((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="ANY">Gender (All)</option>
            <option value="MALE">Male Compatible</option>
            <option value="FEMALE">Female Compatible</option>
          </select>
          <input
            className="rounded border px-3 py-2"
            placeholder="Min price"
            value={filters.minPrice}
            onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
          />
          <input
            className="rounded border px-3 py-2"
            placeholder="Max price"
            value={filters.maxPrice}
            onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
          />
          <select
            className="rounded border px-3 py-2"
            value={filters.availability}
            onChange={(e) =>
              setFilters((p) => ({ ...p, availability: e.target.value }))
            }
          >
            <option value="vacant">Available Beds</option>
            <option value="full">Fully Occupied</option>
            <option value="all">All Rooms</option>
          </select>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-white"
            onClick={() => setFilters(defaultFilters)}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Rooms</h2>
          {rooms.length === 0 ? (
            <p className="rounded border p-3 text-sm text-slate-600">No rooms matched.</p>
          ) : null}
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => {
                setSelectedRoomId(room.id);
                void loadRoomDetail(room.id);
              }}
              className={`w-full rounded border p-4 text-left ${
                selectedRoomId === room.id ? "border-blue-500 bg-blue-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Room {room.roomNumber} - {room.block.name}/F{room.floor.floorNumber}
                  </p>
                  <p className="text-sm text-slate-600">
                    {room.sharingType} | Gender: {room.genderRestriction} | Price:{" "}
                    {room.basePrice ?? "N/A"}
                  </p>
                </div>
                <span className="rounded bg-slate-100 px-2 py-1 text-xs">{room.status}</span>
              </div>
              <div className="mt-2 text-sm">
                Beds: Total <b>{room.counts.totalBeds}</b> | Occupied{" "}
                <b>{room.counts.occupiedBeds}</b> | Vacant <b>{room.counts.vacantBeds}</b>
              </div>
              <div className="mt-1 text-xs text-slate-600">
                AC: {String((room.attributes?.ac as boolean | undefined) ?? "NA")} | Smoking:{" "}
                {String((room.attributes?.smokingAllowed as boolean | undefined) ?? "NA")}
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-medium">Room Details & Occupants</h2>
          {!selectedRoom ? (
            <p className="rounded border p-3 text-sm text-slate-600">
              Select a room to view occupants and allocate beds.
            </p>
          ) : (
            <div className="space-y-3 rounded border p-4">
              <div>
                <p className="font-medium">
                  Room {selectedRoom.roomNumber} - {selectedRoom.block.name}/F
                  {selectedRoom.floor.floorNumber}
                </p>
                <p className="text-sm text-slate-600">
                  Total {selectedRoom.counts.totalBeds} | Occupied{" "}
                  {selectedRoom.counts.occupiedBeds} | Vacant {selectedRoom.counts.vacantBeds}
                </p>
              </div>

              {selectedRoom.beds.map((bed) => (
                <div key={bed.id} className="rounded border p-3">
                  <p className="font-medium">
                    Bed {bed.bedNumber} - {bed.occupied ? "Occupied" : "Vacant"}
                  </p>
                  {bed.occupants.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm">
                      {bed.occupants.map((o) => (
                        <li key={o.allocationId}>
                          {o.resident.fullName} ({o.resident.gender}) {o.resident.contact ? `- ${o.resident.contact}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <AllocateForm
                      residents={residents}
                      loading={allocatingBedId === bed.id}
                      onSubmit={(payload) => allocate(bed.id, payload)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function AllocateForm({
  residents,
  loading,
  onSubmit
}: {
  residents: Resident[];
  loading: boolean;
  onSubmit: (payload: { residentId?: string; resident?: Record<string, string> }) => Promise<void>;
}) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [residentId, setResidentId] = useState("");

  async function submitNewResident(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await onSubmit({
      resident: {
        fullName: String(fd.get("fullName") || ""),
        gender: String(fd.get("gender") || ""),
        contact: String(fd.get("contact") || ""),
        email: String(fd.get("email") || "")
      }
    });
    e.currentTarget.reset();
  }

  return (
    <div className="mt-2 space-y-2 text-sm">
      <div className="flex gap-2">
        <button
          type="button"
          className={`rounded border px-2 py-1 ${mode === "existing" ? "bg-slate-900 text-white" : ""}`}
          onClick={() => setMode("existing")}
        >
          Existing Resident
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 ${mode === "new" ? "bg-slate-900 text-white" : ""}`}
          onClick={() => setMode("new")}
        >
          New Resident
        </button>
      </div>

      {mode === "existing" ? (
        <div className="flex gap-2">
          <select
            className="w-full rounded border px-3 py-2"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
          >
            <option value="">Select resident</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName} ({r.gender}) - {r.status}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
            disabled={!residentId || loading}
            onClick={() => onSubmit({ residentId })}
          >
            {loading ? "Allocating..." : "Allocate"}
          </button>
        </div>
      ) : (
        <form className="grid gap-2 md:grid-cols-2" onSubmit={submitNewResident}>
          <input required name="fullName" placeholder="Full name" className="rounded border px-3 py-2" />
          <select required name="gender" className="rounded border px-3 py-2">
            <option value="">Gender</option>
            <option value="MALE">MALE</option>
            <option value="FEMALE">FEMALE</option>
            <option value="OTHER">OTHER</option>
          </select>
          <input name="contact" placeholder="Contact" className="rounded border px-3 py-2" />
          <input name="email" placeholder="Email" className="rounded border px-3 py-2" />
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50 md:col-span-2"
            disabled={loading}
          >
            {loading ? "Allocating..." : "Create + Allocate"}
          </button>
        </form>
      )}
    </div>
  );
}
