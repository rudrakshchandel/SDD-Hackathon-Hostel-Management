"use client";

import { api } from "@/lib/api-client";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import LiquidLoader from "@/app/components/liquid-loader";
import { useToast } from "@/lib/toast-context";

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
  availableBeds: Array<{ id: string; bedNumber: string; status: string }>;
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

type FeatureState = boolean | null;

const roomTypeLabels: Record<string, string> = {
  SINGLE: "Single",
  DOUBLE: "Double",
  TRIPLE: "Triple",
  DORMITORY: "Dormitory"
};

const genderRestrictionLabels: Record<string, string> = {
  ANY: "Any",
  MALE_ONLY: "Male Only",
  FEMALE_ONLY: "Female Only"
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive",
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved"
};

function labelFor(
  value: string,
  dictionary: Record<string, string>,
  fallback = value
) {
  return dictionary[value] ?? fallback;
}

function mutationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Action failed unexpectedly.";
}

function formatInr(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

function readFeatureState(
  attributes: Record<string, unknown> | null,
  key: string
): FeatureState {
  const value = attributes?.[key];
  return typeof value === "boolean" ? value : null;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M5 10.5L8.2 13.5L15 6.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M7.8 7.4A2.5 2.5 0 0 1 12.2 9c0 1.8-2.2 1.9-2.2 3.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

function FeatureBadge({
  state,
  whenTrue,
  whenFalse,
  whenUnknown
}: {
  state: FeatureState;
  whenTrue: string;
  whenFalse: string;
  whenUnknown: string;
}) {
  if (state === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/60 bg-emerald-100/70 px-2 py-1 text-xs text-emerald-800">
        <CheckIcon />
        {whenTrue}
      </span>
    );
  }

  if (state === false) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/60 bg-rose-100/70 px-2 py-1 text-xs text-rose-800">
        <XIcon />
        {whenFalse}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/60 bg-slate-100/70 px-2 py-1 text-xs text-slate-700">
      <QuestionIcon />
      {whenUnknown}
    </span>
  );
}

function RoomFeatureBadges({
  attributes
}: {
  attributes: Record<string, unknown> | null;
}) {
  const ac = readFeatureState(attributes, "ac");
  const smoking = readFeatureState(attributes, "smokingAllowed");

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <FeatureBadge
        state={ac}
        whenTrue="AC"
        whenFalse="Non-AC"
        whenUnknown="AC Unknown"
      />
      <FeatureBadge
        state={smoking}
        whenTrue="Smoking Allowed"
        whenFalse="No Smoking"
        whenUnknown="Smoking Unknown"
      />
    </div>
  );
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
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [transferTargetByResident, setTransferTargetByResident] = useState<
    Record<string, string>
  >({});
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const query = useMemo(() => filtersToQuery(filters), [filters]);

  const roomsQuery = useQuery({
    queryKey: ["rooms", query],
    queryFn: () => api<RoomsApiResponse>(`/api/rooms?${query}`),
    refetchInterval: 10_000
  });

  const residentsQuery = useQuery({
    queryKey: ["residents"],
    queryFn: () => api<Resident[]>("/api/residents"),
    refetchInterval: 30_000
  });

  const roomDetailQuery = useQuery({
    queryKey: ["room-detail", selectedRoomId],
    queryFn: () => api<RoomDetail>(`/api/rooms/${selectedRoomId}`),
    enabled: Boolean(selectedRoomId),
    refetchInterval: selectedRoomId ? 10_000 : false
  });

  useEffect(() => {
    if (!selectedRoomId || !roomsQuery.data) return;
    const selectedStillVisible = roomsQuery.data.rooms.some(
      (room) => room.id === selectedRoomId
    );
    if (!selectedStillVisible) {
      setSelectedRoomId(null);
    }
  }, [selectedRoomId, roomsQuery.data]);

  const allocateMutation = useMutation({
    mutationFn: ({
      bedId,
      payload
    }: {
      bedId: string;
      payload: { residentId?: string; resident?: Record<string, string> };
    }) => api("/api/residents/allocate", "POST", { bedId, ...payload }),
    onSuccess: async () => {
      showToast("Bed allocated successfully", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["residents"] }),
        selectedRoomId
          ? queryClient.invalidateQueries({
              queryKey: ["room-detail", selectedRoomId]
            })
          : Promise.resolve()
      ]);
    },
    onError: (error) => {
      showToast(mutationErrorMessage(error), "error");
    }
  });

  const vacateMutation = useMutation({
    mutationFn: ({ residentId }: { residentId: string }) =>
      api("/api/residents/vacate", "POST", { residentId }),
    onSuccess: async () => {
      showToast("Resident vacated successfully", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["residents"] }),
        selectedRoomId
          ? queryClient.invalidateQueries({
              queryKey: ["room-detail", selectedRoomId]
            })
          : Promise.resolve()
      ]);
    },
    onError: (error) => {
      showToast(mutationErrorMessage(error), "error");
    }
  });

  const transferMutation = useMutation({
    mutationFn: ({
      residentId,
      targetBedId
    }: {
      residentId: string;
      targetBedId: string;
    }) => api("/api/residents/transfer", "POST", { residentId, targetBedId }),
    onSuccess: async () => {
      showToast("Resident transferred successfully", "success");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["residents"] }),
        selectedRoomId
          ? queryClient.invalidateQueries({
              queryKey: ["room-detail", selectedRoomId]
            })
          : Promise.resolve()
      ]);
    },
    onError: (error) => {
      showToast(mutationErrorMessage(error), "error");
    }
  });

  async function allocate(
    bedId: string,
    payload: { residentId?: string; resident?: Record<string, string> }
  ) {
    try {
      await allocateMutation.mutateAsync({ bedId, payload });
    } catch {
      // Error state is surfaced through `allocateMutation.error`.
    }
  }

  async function vacate(residentId: string) {
    try {
      await vacateMutation.mutateAsync({ residentId });
    } catch {
      // Error surfaced through mutation state.
    }
  }

  async function transfer(residentId: string, targetBedId: string) {
    if (!targetBedId) return;
    try {
      await transferMutation.mutateAsync({ residentId, targetBedId });
      setTransferTargetByResident((prev) => ({ ...prev, [residentId]: "" }));
    } catch {
      // Error surfaced through mutation state.
    }
  }

  const filterOptions = roomsQuery.data?.filterOptions ?? {
    blocks: [],
    floors: []
  };
  const rooms = useMemo(() => roomsQuery.data?.rooms ?? [], [roomsQuery.data?.rooms]);
  const transferTargets = useMemo(
    () =>
      rooms.flatMap((room) =>
        room.availableBeds
          .filter((target) => target.status === "AVAILABLE")
          .map((bed) => ({
            id: bed.id,
            label: `${room.block.name}/F${room.floor.floorNumber} • Room ${room.roomNumber} • Bed ${bed.bedNumber}`
          }))
      ),
    [rooms]
  );
  const selectedRoom = roomDetailQuery.data ?? null;
  const residents = residentsQuery.data ?? [];
  const allocatingBedId =
    allocateMutation.isPending && allocateMutation.variables
      ? allocateMutation.variables.bedId
      : null;
  const pageError =
    roomsQuery.error ??
    roomDetailQuery.error ??
    residentsQuery.error ??
    null;
  const error =
    pageError instanceof Error ? pageError.message : pageError ? String(pageError) : null;

  const visibleFloors = useMemo(
    () =>
      filterOptions.floors.filter((floor) =>
        filters.blockId ? floor.blockId === filters.blockId : true
      ),
    [filterOptions.floors, filters.blockId]
  );

  if (roomsQuery.isLoading && !roomsQuery.data) {
    return (
      <main className="mx-auto max-w-7xl p-6 text-slate-700">
        <div className="mx-auto flex min-h-[45vh] max-w-4xl items-center justify-center">
          <LiquidLoader label="Loading rooms..." />
        </div>
      </main>
    );
  }

  return (
    <main className="page-enter mx-auto max-w-7xl space-y-6 p-6">
      <header className="section-enter section-delay-1 space-y-1">
        <h1 className="text-2xl font-semibold">Room Search & Allocation</h1>
        <p className="text-sm text-slate-600">
          Filter rooms, inspect occupants, and allocate beds in one click.
        </p>
      </header>

      {error ? (
        <div className="section-enter section-delay-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <section className="glass-panel section-enter section-delay-2 p-4">
        <h2 className="mb-3 text-lg font-medium">Filters</h2>
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
          <Select
           
            value={filters.sharingType}
            onChange={(e) => setFilters((p) => ({ ...p, sharingType: e.target.value }))}
          >
            <option value="">Sharing Type (All)</option>
            <option value="SINGLE">{labelFor("SINGLE", roomTypeLabels)}</option>
            <option value="DOUBLE">{labelFor("DOUBLE", roomTypeLabels)}</option>
            <option value="TRIPLE">{labelFor("TRIPLE", roomTypeLabels)}</option>
            <option value="DORMITORY">{labelFor("DORMITORY", roomTypeLabels)}</option>
          </Select>
          <Select
           
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
          </Select>
          <Select
           
            value={filters.floorId}
            onChange={(e) => setFilters((p) => ({ ...p, floorId: e.target.value }))}
          >
            <option value="">Floor (All)</option>
            {visibleFloors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.block.name} - Floor {f.floorNumber}
              </option>
            ))}
          </Select>
          <Select
           
            value={filters.ac}
            onChange={(e) => setFilters((p) => ({ ...p, ac: e.target.value }))}
          >
            <option value="any">AC/Non-AC (All)</option>
            <option value="true">AC</option>
            <option value="false">Non-AC</option>
          </Select>
          <Select
           
            value={filters.smoking}
            onChange={(e) => setFilters((p) => ({ ...p, smoking: e.target.value }))}
          >
            <option value="any">Smoking (All)</option>
            <option value="true">Smoking Allowed</option>
            <option value="false">No Smoking</option>
          </Select>
          <Select
           
            value={filters.gender}
            onChange={(e) => setFilters((p) => ({ ...p, gender: e.target.value }))}
          >
            <option value="ANY">Gender (All)</option>
            <option value="MALE">Male Compatible</option>
            <option value="FEMALE">Female Compatible</option>
          </Select>
          <Input
           
            placeholder="Min price (₹)"
            value={filters.minPrice}
            onChange={(e) => setFilters((p) => ({ ...p, minPrice: e.target.value }))}
          />
          <Input
           
            placeholder="Max price (₹)"
            value={filters.maxPrice}
            onChange={(e) => setFilters((p) => ({ ...p, maxPrice: e.target.value }))}
          />
          <Select
           
            value={filters.availability}
            onChange={(e) =>
              setFilters((p) => ({ ...p, availability: e.target.value }))
            }
          >
            <option value="vacant">Available Beds</option>
            <option value="full">Fully Occupied</option>
            <option value="all">All Rooms</option>
          </Select>
          <Button type="button" onClick={() => setFilters(defaultFilters)}>
            Reset
          </Button>
        </div>
      </section>

      <section className="section-enter section-delay-3 space-y-3">
        <h2 className="text-lg font-medium">Rooms</h2>
        {rooms.length === 0 ? (
          <p className="glass-card p-3 text-sm text-slate-600">No rooms matched.</p>
        ) : null}
        {rooms.map((room) => {
          const isSelected = selectedRoomId === room.id;
          const selectedRoomDetails =
            isSelected && selectedRoom?.id === room.id ? selectedRoom : null;

          return (
            <div
              key={room.id}
              className={`glass-card w-full p-4 text-left ${
                isSelected ? "ring-2 ring-sky-300" : ""
              }`}
            >
              <button
                type="button"
                onClick={() =>
                  setSelectedRoomId((current) => (current === room.id ? null : room.id))
                }
                className="w-full text-left border-0 bg-transparent p-0 shadow-none backdrop-blur-none hover:translate-y-0 hover:bg-transparent"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      Room {room.roomNumber} - {room.block.name}/F{room.floor.floorNumber}
                    </p>
                    <p className="text-sm text-slate-600">
                      {labelFor(room.sharingType, roomTypeLabels)} | Gender:{" "}
                      {labelFor(room.genderRestriction, genderRestrictionLabels)} | Price:{" "}
                      {formatInr(room.basePrice)}
                    </p>
                  </div>
                  <span className="glass-chip">{labelFor(room.status, statusLabels)}</span>
                </div>
                <div className="mt-2 text-sm">
                  Beds: Total <b>{room.counts.totalBeds}</b> | Occupied{" "}
                  <b>{room.counts.occupiedBeds}</b> | Vacant <b>{room.counts.vacantBeds}</b>
                </div>
                <RoomFeatureBadges attributes={room.attributes} />
              </button>

              <AnimatePresence initial={false}>
                {isSelected ? (
                  <motion.div
                    key="room-details"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 border-t border-white/40 pt-3">
                      {roomDetailQuery.isLoading && !selectedRoomDetails ? (
                        <LiquidLoader label="Loading room details..." compact />
                      ) : null}

                      {selectedRoomDetails ? (
                        <div className="glass-panel space-y-3 p-4">
                          <div>
                            <p className="font-medium">
                              Room {selectedRoomDetails.roomNumber} - {selectedRoomDetails.block.name}
                              /F{selectedRoomDetails.floor.floorNumber}
                            </p>
                            <p className="text-sm text-slate-600">
                              Total {selectedRoomDetails.counts.totalBeds} | Occupied{" "}
                              {selectedRoomDetails.counts.occupiedBeds} | Vacant{" "}
                              {selectedRoomDetails.counts.vacantBeds}
                            </p>
                            <RoomFeatureBadges attributes={selectedRoomDetails.attributes} />
                          </div>

                          {selectedRoomDetails.beds.map((bed) => (
                            <div key={bed.id} className="glass-card p-3">
                              <p className="font-medium">
                                Bed {bed.bedNumber} - {bed.occupied ? "Occupied" : "Vacant"}
                              </p>
                              {bed.occupants.length > 0 ? (
                                <ul className="mt-2 space-y-1 text-sm">
                                  {bed.occupants.map((o) => (
                                    <li
                                      key={o.allocationId}
                                      className="space-y-2 border-b border-white/40 pb-2 last:border-b-0 last:pb-0"
                                    >
                                      <p>
                                        {o.resident.fullName} (
                                        {labelFor(o.resident.gender, {
                                          MALE: "Male",
                                          FEMALE: "Female",
                                          OTHER: "Other"
                                        })}
                                        ) {o.resident.contact ? `- ${o.resident.contact}` : ""}
                                      </p>
                                      <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                                        <Select
                                          value={transferTargetByResident[o.resident.id] ?? ""}
                                          onChange={(e) =>
                                            setTransferTargetByResident((prev) => ({
                                              ...prev,
                                              [o.resident.id]: e.target.value
                                            }))
                                          }
                                        >
                                          <option value="">Transfer to...</option>
                                          {transferTargets.map((target) => (
                                            <option key={target.id} value={target.id}>
                                              {target.label}
                                            </option>
                                          ))}
                                        </Select>
                                        <Button
                                          variant="secondary"
                                          disabled={
                                            transferMutation.isPending ||
                                            !transferTargetByResident[o.resident.id]
                                          }
                                          onClick={() =>
                                            transfer(
                                              o.resident.id,
                                              transferTargetByResident[o.resident.id] || ""
                                            )
                                          }
                                        >
                                          {transferMutation.isPending
                                            ? "Transferring..."
                                            : "Transfer"}
                                        </Button>
                                        <Button
                                          variant="danger"
                                          disabled={vacateMutation.isPending}
                                          onClick={() => vacate(o.resident.id)}
                                        >
                                          {vacateMutation.isPending ? "Vacating..." : "Vacate"}
                                        </Button>
                                      </div>
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
                      ) : null}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
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
    const form = e.currentTarget;
    const fd = new FormData(form);
    await onSubmit({
      resident: {
        fullName: String(fd.get("fullName") || ""),
        gender: String(fd.get("gender") || ""),
        contact: String(fd.get("contact") || ""),
        email: String(fd.get("email") || "")
      }
    });
    form.reset();
  }

  return (
    <div className="mt-2 space-y-2 text-sm">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "existing" ? "primary" : "secondary"}
          className="px-2 py-1 text-xs"
          onClick={() => setMode("existing")}
        >
          Existing Resident
        </Button>
        <Button
          type="button"
          variant={mode === "new" ? "primary" : "secondary"}
          className="px-2 py-1 text-xs"
          onClick={() => setMode("new")}
        >
          New Resident
        </Button>
      </div>

      {mode === "existing" ? (
        <div className="flex gap-2">
          <Select
            className="w-full"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
          >
            <option value="">Select resident</option>
            {residents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName} ({labelFor(r.gender, { MALE: "Male", FEMALE: "Female", OTHER: "Other" })}) -{" "}
                {labelFor(r.status, statusLabels)}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            disabled={!residentId || loading}
            className="disabled:opacity-50"
            onClick={() => onSubmit({ residentId })}
          >
            {loading ? "Allocating..." : "Allocate"}
          </Button>
        </div>
      ) : (
        <form className="grid gap-2 md:grid-cols-2" onSubmit={submitNewResident}>
          <Input required name="fullName" placeholder="Full name" />
          <Select required name="gender">
            <option value="">Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
          <Input name="contact" placeholder="Contact" />
          <Input name="email" placeholder="Email" />
          <Button
            type="submit"
            className="disabled:opacity-50 md:col-span-2"
            disabled={loading}
          >
            {loading ? "Allocating..." : "Create + Allocate"}
          </Button>
        </form>
      )}
    </div>
  );
}
