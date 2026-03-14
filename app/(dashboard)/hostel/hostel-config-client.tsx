"use client";

import { api } from "@/lib/api-client";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, ReactNode, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import LiquidLoader from "@/app/components/liquid-loader";
import { useToast } from "@/lib/toast-context";

type Bed = {
  id: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
};

type ElectricityMeter = {
  id: string;
  meterNumber: string;
  installationDate: string;
  isActive: boolean;
};

type Room = {
  id: string;
  roomNumber: string;
  sharingType: "SINGLE" | "DOUBLE" | "TRIPLE" | "DORMITORY";
  genderRestriction: "ANY" | "MALE_ONLY" | "FEMALE_ONLY";
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  basePrice: string | null;
  attributes: Record<string, unknown> | null;
  beds: Bed[];
  electricityMeter: ElectricityMeter | null;
};

type Floor = {
  id: string;
  floorNumber: number;
  label: string | null;
  rooms: Room[];
};

type HostelTree = {
  id: string;
  name: string;
  address: string;
  contactNumber: string | null;
  timezone: string | null;
  status: "ACTIVE" | "INACTIVE";
  billingCycle: "MONTHLY" | "CUSTOM";
  electricityRatePerUnit: string | null;
  electricitySplitMode: "EQUAL" | "STAY_DURATION";
  electricityType: "NO_ELECTRICITY" | "PREPAID" | "METER_BASED";
  floors: Floor[];
};

const sharingTypeLabels: Record<Room["sharingType"], string> = {
  SINGLE: "Single",
  DOUBLE: "Double",
  TRIPLE: "Triple",
  DORMITORY: "Dormitory"
};

const genderRestrictionLabels: Record<Room["genderRestriction"], string> = {
  ANY: "Any",
  MALE_ONLY: "Male Only",
  FEMALE_ONLY: "Female Only"
};

const roomStatusLabels: Record<Room["status"], string> = {
  ACTIVE: "Active",
  MAINTENANCE: "Maintenance",
  INACTIVE: "Inactive"
};

const bedStatusLabels: Record<Bed["status"], string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance"
};

const hostelStatusLabels: Record<HostelTree["status"], string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive"
};

const electricityTypes = [
  { value: "NO_ELECTRICITY", label: "No Electricity" },
  { value: "PREPAID", label: "Prepaid" },
  { value: "METER_BASED", label: "Meter Based" }
];

const billingCycles = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" }
];

const splitModes = [
  { value: "EQUAL", label: "Equal" },
  { value: "STAY_DURATION", label: "Stay Duration" }
];

const actionButtonBaseClass =
  "h-11 w-full min-w-[8.5rem] rounded-xl px-3 py-2 text-sm font-medium md:w-auto md:justify-self-end";
const primaryActionClass = `glass-btn-primary ${actionButtonBaseClass}`;
const secondaryActionClass = `glass-btn-secondary ${actionButtonBaseClass}`;
const dangerActionClass = `glass-btn-danger ${actionButtonBaseClass}`;

function hasAttr(attributes: Room["attributes"], key: string) {
  return attributes?.[key] === true;
}

function collectRoomAttributes(fd: FormData) {
  return {
    ac: fd.get("attrAc") === "on",
    wifi: fd.get("attrWifi") === "on",
    attachedBath: fd.get("attrAttachedBath") === "on",
    smokingAllowed: fd.get("attrSmokingAllowed") === "on"
  };
}

function RoomAttributeChips({ attributes }: { attributes: Room["attributes"] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
      <span className="glass-chip">{hasAttr(attributes, "ac") ? "AC" : "Non-AC"}</span>
      <span className="glass-chip">
        {hasAttr(attributes, "wifi") ? "Wi-Fi" : "No Wi-Fi"}
      </span>
      <span className="glass-chip">
        {hasAttr(attributes, "attachedBath") ? "Attached Bath" : "Common Bath"}
      </span>
      <span className="glass-chip">
        {hasAttr(attributes, "smokingAllowed") ? "Smoking Allowed" : "No Smoking"}
      </span>
    </div>
  );
}

type CollapsibleSectionProps = {
  id: string;
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
};

function CollapsibleSection({
  id,
  title,
  children,
  defaultOpen = false,
  className = "glass-card p-3",
  summaryClassName = "font-medium"
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `${id}-content`;

  return (
    <section className={className}>
      <button
        type="button"
        className={`flex w-full items-center gap-2 text-left ${summaryClassName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <motion.span
          aria-hidden
          className="inline-block text-xs text-slate-600"
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          ▶
        </motion.span>
        <span>{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

export default function HostelConfigClient() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hostelQuery = useQuery({
    queryKey: ["hostel-config"],
    queryFn: () => api<HostelTree | null>("/api/hostel")
  });
  const hostel = hostelQuery.data ?? null;
  const actionMutation = useMutation({
    mutationFn: ({
      url,
      method,
      body
    }: {
      url: string;
      method: string;
      body?: unknown;
    }) => api<HostelTree | null>(url, method, body),
    onSuccess: (data) => {
      queryClient.setQueryData(["hostel-config"], data);
    }
  });

  async function runAction(
    action: { url: string; method: string; body?: unknown },
    okMsg: string
  ) {
    try {
      await actionMutation.mutateAsync(action);
      showToast(okMsg, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Action failed unexpectedly.";
      showToast(message, "error");
      throw error;
    }
  }

  async function submitHostel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      address: String(formData.get("address") || ""),
      contactNumber: String(formData.get("contactNumber") || ""),
      timezone: String(formData.get("timezone") || ""),
      status: String(formData.get("status") || "ACTIVE"),
      electricityType: String(formData.get("electricityType") || "NO_ELECTRICITY"),
      electricityRatePerUnit: String(formData.get("electricityRatePerUnit") || ""),
      billingCycle: String(formData.get("billingCycle") || "MONTHLY"),
      electricitySplitMode: String(formData.get("electricitySplitMode") || "STAY_DURATION")
    };

    await runAction(
      {
        url: "/api/hostel",
        method: hostel ? "PUT" : "POST",
        body: payload
      },
      hostel ? "Hostel profile updated" : "Hostel profile created"
    );
  }

  if (hostelQuery.isLoading && !hostelQuery.data) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="mx-auto flex min-h-[45vh] max-w-4xl items-center justify-center">
          <LiquidLoader label="Loading hostel configuration..." />
        </div>
      </main>
    );
  }
  const queryError = hostelQuery.error ?? null;
  const error =
    queryError instanceof Error ? queryError.message : queryError ? String(queryError) : null;

  return (
    <main className="page-enter mx-auto max-w-7xl space-y-6 p-6">
      <header className="section-enter section-delay-1">
        <h1 className="text-2xl font-semibold">Hostel Configuration</h1>
        <p className="text-sm text-slate-600">
          Manage hostel profile, floors, rooms, and beds.
        </p>
      </header>

      {error ? (
        <div className="section-enter section-delay-2 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <section className="glass-panel section-enter section-delay-2 p-4">
        <h2 className="mb-3 text-lg font-medium">Hostel Profile</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitHostel}>
          <Input
            required
            name="name"
            placeholder="Hostel name"
            defaultValue={hostel?.name ?? ""}
           
          />
          <Input
            required
            name="address"
            placeholder="Address"
            defaultValue={hostel?.address ?? ""}
           
          />
          <Input
            name="contactNumber"
            placeholder="Contact number"
            defaultValue={hostel?.contactNumber ?? ""}
           
          />
          <Input
            name="timezone"
            placeholder="Timezone (e.g. Asia/Kolkata)"
            defaultValue={hostel?.timezone ?? ""}
           
          />
          <Select
            name="status"
            defaultValue={hostel?.status ?? "ACTIVE"}
          >
            <option value="ACTIVE">{hostelStatusLabels.ACTIVE}</option>
            <option value="INACTIVE">{hostelStatusLabels.INACTIVE}</option>
          </Select>
          <div className="md:col-span-2 grid gap-3 md:grid-cols-4 border-t pt-3 mt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Electricity Type</label>
              <Select name="electricityType" defaultValue={hostel?.electricityType ?? "NO_ELECTRICITY"}>
                {electricityTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Rate per Unit</label>
              <Input name="electricityRatePerUnit" placeholder="Unit Rate" defaultValue={hostel?.electricityRatePerUnit ?? ""} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Billing Cycle</label>
              <Select name="billingCycle" defaultValue={hostel?.billingCycle ?? "MONTHLY"}>
                {billingCycles.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500 ml-1">Split Mode</label>
              <Select name="electricitySplitMode" defaultValue={hostel?.electricitySplitMode ?? "STAY_DURATION"}>
                {splitModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </Select>
            </div>
          </div>
          <button className={primaryActionClass} type="submit">
            {hostel ? "Update Hostel & Settings" : "Create Hostel"}
          </button>
        </form>
      </section>

      {hostel ? (
        <section className="glass-panel section-enter section-delay-3 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Structure Tree</h2>
        </div>

        <div className="space-y-4">
          <form
            className="flex flex-wrap gap-2 rounded border border-dashed p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void runAction(
                {
                  url: `/api/hostel/floors`,
                  method: "POST",
                  body: {
                    floorNumber: Number(fd.get("floorNumber")),
                    label: String(fd.get("label") || "")
                  }
                },
                "Floor added"
              );
              e.currentTarget.reset();
            }}
          >
            <Input required name="floorNumber" type="number" placeholder="Floor no." className="w-24" />
            <Input name="label" placeholder="Label (e.g. Ground Floor)" className="flex-1" />
            <button className={primaryActionClass} type="submit">
              Add Floor
            </button>
          </form>

          {hostel.floors.map((floor) => (
                    <CollapsibleSection
                      key={floor.id}
                      id={`floor-${floor.id}`}
                      title={`Floor ${floor.floorNumber} (${floor.rooms.length} rooms)`}
                      className="glass-card p-3"
                    >
                      <div className="mt-3 space-y-3">
                        <form
                          className="grid gap-2 md:grid-cols-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            void runAction(
                              {
                                url: `/api/hostel/floors/${floor.id}`,
                                method: "PUT",
                                body: {
                                  floorNumber: Number(fd.get("floorNumber")),
                                  label: String(fd.get("label") || "")
                                }
                              },
                              "Floor updated"
                            );
                          }}
                        >
                          <Input
                            required
                            type="number"
                            name="floorNumber"
                            defaultValue={floor.floorNumber}
                           
                          />
                          <Input
                            name="label"
                            defaultValue={floor.label ?? ""}
                           
                          />
                          <button className={secondaryActionClass} type="submit">
                            Save Floor
                          </button>
                          <button
                            className={dangerActionClass}
                            type="button"
                            onClick={() =>
                              void runAction(
                                {
                                  url: `/api/hostel/floors/${floor.id}`,
                                  method: "DELETE"
                                },
                                "Floor deleted"
                              )
                            }
                          >
                            Delete Floor
                          </button>
                        </form>

                        <div className="space-y-3 border-l-2 border-slate-100 pl-4">
                          <form
                            className="grid gap-2 md:grid-cols-6"
                            onSubmit={(e) => {
                              e.preventDefault();
                              const fd = new FormData(e.currentTarget);
                              const attributes = collectRoomAttributes(fd);
                              void runAction(
                                {
                                  url: `/api/hostel/floors/${floor.id}/rooms`,
                                  method: "POST",
                                  body: {
                                    roomNumber: String(fd.get("roomNumber") || ""),
                                    sharingType: String(fd.get("sharingType") || "SINGLE"),
                                    genderRestriction: String(fd.get("genderRestriction") || "ANY"),
                                    status: String(fd.get("status") || "ACTIVE"),
                                    basePrice: String(fd.get("basePrice") || ""),
                                    attributes,
                                    electricityMeter: fd.get("meterEnabled") === "on" ? {
                                      meterNumber: "",
                                      installationDate: new Date().toISOString()
                                    } : null
                                  }
                                },
                                "Room added"
                              );
                              e.currentTarget.reset();
                            }}
                          >
                            <Input required name="roomNumber" placeholder="Room no." />
                            <Select name="sharingType">
                              <option value="SINGLE">{sharingTypeLabels.SINGLE}</option>
                              <option value="DOUBLE">{sharingTypeLabels.DOUBLE}</option>
                              <option value="TRIPLE">{sharingTypeLabels.TRIPLE}</option>
                              <option value="DORMITORY">{sharingTypeLabels.DORMITORY}</option>
                            </Select>
                            <Input name="basePrice" placeholder="Base price" />
                            <Select name="genderRestriction">
                              <option value="ANY">{genderRestrictionLabels.ANY}</option>
                              <option value="MALE_ONLY">{genderRestrictionLabels.MALE_ONLY}</option>
                              <option value="FEMALE_ONLY">{genderRestrictionLabels.FEMALE_ONLY}</option>
                            </Select>
                            <Select name="status">
                              <option value="ACTIVE">{roomStatusLabels.ACTIVE}</option>
                              <option value="MAINTENANCE">{roomStatusLabels.MAINTENANCE}</option>
                              <option value="INACTIVE">{roomStatusLabels.INACTIVE}</option>
                            </Select>
                            <button className={primaryActionClass} type="submit">
                              Add Room
                            </button>
                            <div className="md:col-span-1 flex items-center gap-2 rounded border px-3 py-2 text-sm bg-slate-50">
                              <input type="checkbox" name="meterEnabled" id={`new-room-meter-${floor.id}`} />
                              <label htmlFor={`new-room-meter-${floor.id}`} className="font-medium">Electricity</label>
                            </div>
                            <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                              <input type="checkbox" name="attrAc" /> AC
                            </label>
                            <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                              <input type="checkbox" name="attrWifi" /> Wi-Fi
                            </label>
                            <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                              <input type="checkbox" name="attrAttachedBath" /> Attached Bath
                            </label>
                            <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                              <input type="checkbox" name="attrSmokingAllowed" /> Smoking Allowed
                            </label>
                          </form>

                          {floor.rooms.map((room) => (
                            <CollapsibleSection
                              key={room.id}
                              id={`room-${room.id}`}
                              title={`Room ${room.roomNumber} (${room.beds.length} beds)`}
                              className="ml-4 glass-card p-3"
                              summaryClassName="text-sm font-medium"
                            >
                              <RoomAttributeChips attributes={room.attributes} />
                              <div className="mt-3 space-y-3">
                                <form
                                  className="grid gap-2 md:grid-cols-6"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    const attributes = collectRoomAttributes(fd);
                                    void runAction(
                                      {
                                        url: `/api/hostel/rooms/${room.id}`,
                                        method: "PUT",
                                        body: {
                                          roomNumber: String(fd.get("roomNumber") || ""),
                                          sharingType: String(fd.get("sharingType") || "SINGLE"),
                                          genderRestriction: String(fd.get("genderRestriction") || "ANY"),
                                          status: String(fd.get("status") || "ACTIVE"),
                                          basePrice: String(fd.get("basePrice") || ""),
                                          attributes,
                                          electricityMeter: fd.get("meterEnabled") === "on" ? {
                                            meterNumber: String(fd.get("meterNumber") || ""),
                                            installationDate: String(fd.get("installationDate") || new Date().toISOString().split("T")[0])
                                          } : null
                                        }
                                      },
                                      "Room updated"
                                    );
                                  }}
                                >
                                  <Input
                                    required
                                    name="roomNumber"
                                    defaultValue={room.roomNumber}
                                   
                                  />
                                  <Select
                                    name="sharingType"
                                    defaultValue={room.sharingType}
                                   
                                  >
                                    <option value="SINGLE">{sharingTypeLabels.SINGLE}</option>
                                    <option value="DOUBLE">{sharingTypeLabels.DOUBLE}</option>
                                    <option value="TRIPLE">{sharingTypeLabels.TRIPLE}</option>
                                    <option value="DORMITORY">{sharingTypeLabels.DORMITORY}</option>
                                  </Select>
                                  <Input
                                    name="basePrice"
                                    defaultValue={room.basePrice ?? ""}
                                   
                                  />
                                  <div className="md:col-span-2 flex items-center gap-4 py-1 px-2 border rounded-lg bg-slate-50/50">
                                    <label className="flex items-center gap-2 text-sm font-medium whitespace-nowrap">
                                      <input type="checkbox" name="meterEnabled" defaultChecked={!!room.electricityMeter} />
                                      Electricity Meter
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                      <Input name="meterNumber" placeholder="Meter # (Opt)" className="h-8 text-xs" defaultValue={room.electricityMeter?.meterNumber ?? ""} />
                                      <Input type="date" name="installationDate" className="h-8 text-xs" defaultValue={room.electricityMeter?.installationDate ? new Date(room.electricityMeter.installationDate).toISOString().split("T")[0] : ""} />
                                    </div>
                                  </div>
                                  <Select
                                    name="genderRestriction"
                                    defaultValue={room.genderRestriction}
                                   
                                  >
                                    <option value="ANY">{genderRestrictionLabels.ANY}</option>
                                    <option value="MALE_ONLY">{genderRestrictionLabels.MALE_ONLY}</option>
                                    <option value="FEMALE_ONLY">{genderRestrictionLabels.FEMALE_ONLY}</option>
                                  </Select>
                                  <Select
                                    name="status"
                                    defaultValue={room.status}
                                   
                                  >
                                    <option value="ACTIVE">{roomStatusLabels.ACTIVE}</option>
                                    <option value="MAINTENANCE">{roomStatusLabels.MAINTENANCE}</option>
                                    <option value="INACTIVE">{roomStatusLabels.INACTIVE}</option>
                                  </Select>
                                  <button className={secondaryActionClass} type="submit">
                                    Save Room
                                  </button>
                                  <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name="attrAc"
                                      defaultChecked={hasAttr(room.attributes, "ac")}
                                    />
                                    AC
                                  </label>
                                  <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name="attrWifi"
                                      defaultChecked={hasAttr(room.attributes, "wifi")}
                                    />
                                    Wi-Fi
                                  </label>
                                  <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name="attrAttachedBath"
                                      defaultChecked={hasAttr(room.attributes, "attachedBath")}
                                    />
                                    Attached Bath
                                  </label>
                                  <label className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
                                    <input
                                      type="checkbox"
                                      name="attrSmokingAllowed"
                                      defaultChecked={hasAttr(room.attributes, "smokingAllowed")}
                                    />
                                    Smoking Allowed
                                  </label>
                                  <button
                                    className={dangerActionClass}
                                    type="button"
                                    onClick={() =>
                                      void runAction(
                                        {
                                          url: `/api/hostel/rooms/${room.id}`,
                                          method: "DELETE"
                                        },
                                        "Room deleted"
                                      )
                                    }
                                  >
                                    Delete Room
                                  </button>
                                </form>

                                <form
                                  className="grid gap-2 md:grid-cols-[1fr_1fr_auto]"
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const fd = new FormData(e.currentTarget);
                                    void runAction(
                                      {
                                        url: `/api/hostel/rooms/${room.id}/beds`,
                                        method: "POST",
                                        body: {
                                          bedNumber: String(fd.get("bedNumber") || ""),
                                          status: String(fd.get("status") || "AVAILABLE")
                                        }
                                      },
                                      "Bed added"
                                    );
                                    e.currentTarget.reset();
                                  }}
                                >
                                  <Input required name="bedNumber" placeholder="Bed no." />
                                  <Select name="status">
                                    <option value="AVAILABLE">{bedStatusLabels.AVAILABLE}</option>
                                    <option value="OCCUPIED">{bedStatusLabels.OCCUPIED}</option>
                                    <option value="RESERVED">{bedStatusLabels.RESERVED}</option>
                                    <option value="MAINTENANCE">{bedStatusLabels.MAINTENANCE}</option>
                                  </Select>
                                  <button className={primaryActionClass} type="submit">
                                    Add Bed
                                  </button>
                                </form>

                                <div className="space-y-2">
                                  {room.beds.map((bed) => (
                                    <form
                                      key={bed.id}
                                      className="grid gap-2 glass-card p-2 md:grid-cols-4"
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const fd = new FormData(e.currentTarget);
                                        void runAction(
                                          {
                                            url: `/api/hostel/beds/${bed.id}`,
                                            method: "PUT",
                                            body: {
                                              bedNumber: String(fd.get("bedNumber") || ""),
                                              status: String(fd.get("status") || "AVAILABLE")
                                            }
                                          },
                                          "Bed updated"
                                        );
                                      }}
                                    >
                                      <Input
                                        required
                                        name="bedNumber"
                                        defaultValue={bed.bedNumber}
                                       
                                      />
                                      <Select
                                        name="status"
                                        defaultValue={bed.status}
                                       
                                      >
                                        <option value="AVAILABLE">{bedStatusLabels.AVAILABLE}</option>
                                        <option value="OCCUPIED">{bedStatusLabels.OCCUPIED}</option>
                                        <option value="RESERVED">{bedStatusLabels.RESERVED}</option>
                                        <option value="MAINTENANCE">{bedStatusLabels.MAINTENANCE}</option>
                                      </Select>
                                      <button className={secondaryActionClass} type="submit">
                                        Save Bed
                                      </button>
                                      <button
                                        className={dangerActionClass}
                                        type="button"
                                        onClick={() =>
                                          void runAction(
                                            {
                                              url: `/api/hostel/beds/${bed.id}`,
                                              method: "DELETE"
                                            },
                                            "Bed deleted"
                                          )
                                        }
                                      >
                                        Delete Bed
                                      </button>
                                    </form>
                                  ))}
                                </div>
                              </div>
                            </CollapsibleSection>
                          ))}
                        </div>
                      </div>
                    </CollapsibleSection>
                  ))}
        </div>
      </section>
      ) : null}
    </main>
  );
}

