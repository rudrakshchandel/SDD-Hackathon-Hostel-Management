"use client";

import { FormEvent, useEffect, useState } from "react";

type Bed = {
  id: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
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
};

type Floor = {
  id: string;
  floorNumber: number;
  label: string | null;
  rooms: Room[];
};

type Block = {
  id: string;
  name: string;
  description: string | null;
  floors: Floor[];
};

type HostelTree = {
  id: string;
  name: string;
  address: string;
  contactNumber: string | null;
  timezone: string | null;
  status: "ACTIVE" | "INACTIVE";
  blocks: Block[];
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

export default function HostelConfigClient() {
  const [hostel, setHostel] = useState<HostelTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<HostelTree | null>("/api/hostel");
      setHostel(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: () => Promise<HostelTree | null>, okMsg: string) {
    setError(null);
    setMessage(null);
    try {
      const data = await action();
      setHostel(data);
      setMessage(okMsg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
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
      status: String(formData.get("status") || "ACTIVE")
    };

    await runAction(
      () => api("/api/hostel", hostel ? "PUT" : "POST", payload),
      hostel ? "Hostel profile updated" : "Hostel profile created"
    );
  }

  if (loading) {
    return <main className="p-6">Loading hostel configuration...</main>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Hostel Configuration</h1>
        <p className="text-sm text-slate-600">
          Manage hostel profile, blocks, floors, rooms, and beds.
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
        <h2 className="mb-3 text-lg font-medium">Hostel Profile</h2>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={submitHostel}>
          <input
            required
            name="name"
            placeholder="Hostel name"
            defaultValue={hostel?.name ?? ""}
            className="rounded border px-3 py-2"
          />
          <input
            required
            name="address"
            placeholder="Address"
            defaultValue={hostel?.address ?? ""}
            className="rounded border px-3 py-2"
          />
          <input
            name="contactNumber"
            placeholder="Contact number"
            defaultValue={hostel?.contactNumber ?? ""}
            className="rounded border px-3 py-2"
          />
          <input
            name="timezone"
            placeholder="Timezone (e.g. Asia/Kolkata)"
            defaultValue={hostel?.timezone ?? ""}
            className="rounded border px-3 py-2"
          />
          <select
            name="status"
            defaultValue={hostel?.status ?? "ACTIVE"}
            className="rounded border px-3 py-2"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
          <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">
            {hostel ? "Update Hostel" : "Create Hostel"}
          </button>
        </form>
      </section>

      {hostel ? (
        <section className="space-y-3 rounded border p-4">
          <h2 className="text-lg font-medium">Structure Tree</h2>
          <form
            className="grid gap-2 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void runAction(
                () =>
                  api("/api/hostel/blocks", "POST", {
                    hostelId: hostel.id,
                    name: String(fd.get("name") || ""),
                    description: String(fd.get("description") || "")
                  }),
                "Block added"
              );
              e.currentTarget.reset();
            }}
          >
            <input required name="name" placeholder="New block name" className="rounded border px-3 py-2" />
            <input name="description" placeholder="Description" className="rounded border px-3 py-2" />
            <button className="rounded bg-blue-600 px-3 py-2 text-white" type="submit">
              Add Block
            </button>
          </form>

          <div className="space-y-2">
            {hostel.blocks.map((block) => (
              <details key={block.id} open className="rounded border p-3">
                <summary className="cursor-pointer font-medium">
                  Block: {block.name} ({block.floors.length} floors)
                </summary>
                <div className="mt-3 space-y-3">
                  <form
                    className="grid gap-2 md:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void runAction(
                        () =>
                          api(`/api/hostel/blocks/${block.id}`, "PUT", {
                            name: String(fd.get("name") || ""),
                            description: String(fd.get("description") || "")
                          }),
                        "Block updated"
                      );
                    }}
                  >
                    <input
                      required
                      name="name"
                      defaultValue={block.name}
                      className="rounded border px-3 py-2"
                    />
                    <input
                      name="description"
                      defaultValue={block.description ?? ""}
                      className="rounded border px-3 py-2"
                    />
                    <button className="rounded bg-slate-700 px-3 py-2 text-white" type="submit">
                      Save Block
                    </button>
                    <button
                      className="rounded bg-red-600 px-3 py-2 text-white"
                      type="button"
                      onClick={() =>
                        void runAction(
                          () => api(`/api/hostel/blocks/${block.id}`, "DELETE"),
                          "Block deleted"
                        )
                      }
                    >
                      Delete Block
                    </button>
                  </form>

                  <form
                    className="grid gap-2 md:grid-cols-4"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void runAction(
                        () =>
                          api(`/api/hostel/blocks/${block.id}/floors`, "POST", {
                            floorNumber: Number(fd.get("floorNumber")),
                            label: String(fd.get("label") || "")
                          }),
                        "Floor added"
                      );
                      e.currentTarget.reset();
                    }}
                  >
                    <input
                      required
                      type="number"
                      name="floorNumber"
                      placeholder="Floor number"
                      className="rounded border px-3 py-2"
                    />
                    <input name="label" placeholder="Label" className="rounded border px-3 py-2" />
                    <button className="rounded bg-blue-600 px-3 py-2 text-white" type="submit">
                      Add Floor
                    </button>
                  </form>

                  {block.floors.map((floor) => (
                    <details key={floor.id} className="ml-4 rounded border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Floor {floor.floorNumber} ({floor.rooms.length} rooms)
                      </summary>
                      <div className="mt-3 space-y-3">
                        <form
                          className="grid gap-2 md:grid-cols-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            void runAction(
                              () =>
                                api(`/api/hostel/floors/${floor.id}`, "PUT", {
                                  floorNumber: Number(fd.get("floorNumber")),
                                  label: String(fd.get("label") || "")
                                }),
                              "Floor updated"
                            );
                          }}
                        >
                          <input
                            required
                            type="number"
                            name="floorNumber"
                            defaultValue={floor.floorNumber}
                            className="rounded border px-3 py-2"
                          />
                          <input
                            name="label"
                            defaultValue={floor.label ?? ""}
                            className="rounded border px-3 py-2"
                          />
                          <button className="rounded bg-slate-700 px-3 py-2 text-white" type="submit">
                            Save Floor
                          </button>
                          <button
                            className="rounded bg-red-600 px-3 py-2 text-white"
                            type="button"
                            onClick={() =>
                              void runAction(
                                () => api(`/api/hostel/floors/${floor.id}`, "DELETE"),
                                "Floor deleted"
                              )
                            }
                          >
                            Delete Floor
                          </button>
                        </form>

                        <form
                          className="grid gap-2 md:grid-cols-6"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            let attributes: Record<string, unknown> | null = null;
                            const rawAttrs = String(fd.get("attributes") || "").trim();
                            if (rawAttrs) {
                              try {
                                attributes = JSON.parse(rawAttrs) as Record<string, unknown>;
                              } catch {
                                setError("Room attributes must be valid JSON");
                                return;
                              }
                            }
                            void runAction(
                              () =>
                                api(`/api/hostel/floors/${floor.id}/rooms`, "POST", {
                                  roomNumber: String(fd.get("roomNumber") || ""),
                                  sharingType: String(fd.get("sharingType") || "SINGLE"),
                                  genderRestriction: String(fd.get("genderRestriction") || "ANY"),
                                  status: String(fd.get("status") || "ACTIVE"),
                                  basePrice: String(fd.get("basePrice") || ""),
                                  attributes
                                }),
                              "Room added"
                            );
                            e.currentTarget.reset();
                          }}
                        >
                          <input required name="roomNumber" placeholder="Room no." className="rounded border px-3 py-2" />
                          <select name="sharingType" className="rounded border px-3 py-2">
                            <option value="SINGLE">SINGLE</option>
                            <option value="DOUBLE">DOUBLE</option>
                            <option value="TRIPLE">TRIPLE</option>
                            <option value="DORMITORY">DORMITORY</option>
                          </select>
                          <input name="basePrice" placeholder="Base price" className="rounded border px-3 py-2" />
                          <select name="genderRestriction" className="rounded border px-3 py-2">
                            <option value="ANY">ANY</option>
                            <option value="MALE_ONLY">MALE_ONLY</option>
                            <option value="FEMALE_ONLY">FEMALE_ONLY</option>
                          </select>
                          <select name="status" className="rounded border px-3 py-2">
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="MAINTENANCE">MAINTENANCE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                          <button className="rounded bg-blue-600 px-3 py-2 text-white" type="submit">
                            Add Room
                          </button>
                          <input
                            name="attributes"
                            placeholder='Attributes JSON e.g. {"ac":true}'
                            className="rounded border px-3 py-2 md:col-span-3"
                          />
                        </form>

                        {floor.rooms.map((room) => (
                          <details key={room.id} className="ml-4 rounded border p-3">
                            <summary className="cursor-pointer text-sm font-medium">
                              Room {room.roomNumber} ({room.beds.length} beds)
                            </summary>
                            <div className="mt-3 space-y-3">
                              <form
                                className="grid gap-2 md:grid-cols-6"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const fd = new FormData(e.currentTarget);
                                  let attributes: Record<string, unknown> | null = null;
                                  const rawAttrs = String(fd.get("attributes") || "").trim();
                                  if (rawAttrs) {
                                    try {
                                      attributes = JSON.parse(rawAttrs) as Record<string, unknown>;
                                    } catch {
                                      setError("Room attributes must be valid JSON");
                                      return;
                                    }
                                  }
                                  void runAction(
                                    () =>
                                      api(`/api/hostel/rooms/${room.id}`, "PUT", {
                                        roomNumber: String(fd.get("roomNumber") || ""),
                                        sharingType: String(fd.get("sharingType") || "SINGLE"),
                                        genderRestriction: String(fd.get("genderRestriction") || "ANY"),
                                        status: String(fd.get("status") || "ACTIVE"),
                                        basePrice: String(fd.get("basePrice") || ""),
                                        attributes
                                      }),
                                    "Room updated"
                                  );
                                }}
                              >
                                <input
                                  required
                                  name="roomNumber"
                                  defaultValue={room.roomNumber}
                                  className="rounded border px-3 py-2"
                                />
                                <select
                                  name="sharingType"
                                  defaultValue={room.sharingType}
                                  className="rounded border px-3 py-2"
                                >
                                  <option value="SINGLE">SINGLE</option>
                                  <option value="DOUBLE">DOUBLE</option>
                                  <option value="TRIPLE">TRIPLE</option>
                                  <option value="DORMITORY">DORMITORY</option>
                                </select>
                                <input
                                  name="basePrice"
                                  defaultValue={room.basePrice ?? ""}
                                  className="rounded border px-3 py-2"
                                />
                                <select
                                  name="genderRestriction"
                                  defaultValue={room.genderRestriction}
                                  className="rounded border px-3 py-2"
                                >
                                  <option value="ANY">ANY</option>
                                  <option value="MALE_ONLY">MALE_ONLY</option>
                                  <option value="FEMALE_ONLY">FEMALE_ONLY</option>
                                </select>
                                <select
                                  name="status"
                                  defaultValue={room.status}
                                  className="rounded border px-3 py-2"
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="MAINTENANCE">MAINTENANCE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                                </select>
                                <button className="rounded bg-slate-700 px-3 py-2 text-white" type="submit">
                                  Save Room
                                </button>
                                <input
                                  name="attributes"
                                  defaultValue={room.attributes ? JSON.stringify(room.attributes) : ""}
                                  className="rounded border px-3 py-2 md:col-span-3"
                                />
                                <button
                                  className="rounded bg-red-600 px-3 py-2 text-white"
                                  type="button"
                                  onClick={() =>
                                    void runAction(
                                      () => api(`/api/hostel/rooms/${room.id}`, "DELETE"),
                                      "Room deleted"
                                    )
                                  }
                                >
                                  Delete Room
                                </button>
                              </form>

                              <form
                                className="grid gap-2 md:grid-cols-4"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const fd = new FormData(e.currentTarget);
                                  void runAction(
                                    () =>
                                      api(`/api/hostel/rooms/${room.id}/beds`, "POST", {
                                        bedNumber: String(fd.get("bedNumber") || ""),
                                        status: String(fd.get("status") || "AVAILABLE")
                                      }),
                                    "Bed added"
                                  );
                                  e.currentTarget.reset();
                                }}
                              >
                                <input required name="bedNumber" placeholder="Bed no." className="rounded border px-3 py-2" />
                                <select name="status" className="rounded border px-3 py-2">
                                  <option value="AVAILABLE">AVAILABLE</option>
                                  <option value="OCCUPIED">OCCUPIED</option>
                                  <option value="RESERVED">RESERVED</option>
                                  <option value="MAINTENANCE">MAINTENANCE</option>
                                </select>
                                <button className="rounded bg-blue-600 px-3 py-2 text-white" type="submit">
                                  Add Bed
                                </button>
                              </form>

                              <div className="space-y-2">
                                {room.beds.map((bed) => (
                                  <form
                                    key={bed.id}
                                    className="grid gap-2 rounded border p-2 md:grid-cols-4"
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      const fd = new FormData(e.currentTarget);
                                      void runAction(
                                        () =>
                                          api(`/api/hostel/beds/${bed.id}`, "PUT", {
                                            bedNumber: String(fd.get("bedNumber") || ""),
                                            status: String(fd.get("status") || "AVAILABLE")
                                          }),
                                        "Bed updated"
                                      );
                                    }}
                                  >
                                    <input
                                      required
                                      name="bedNumber"
                                      defaultValue={bed.bedNumber}
                                      className="rounded border px-3 py-2"
                                    />
                                    <select
                                      name="status"
                                      defaultValue={bed.status}
                                      className="rounded border px-3 py-2"
                                    >
                                      <option value="AVAILABLE">AVAILABLE</option>
                                      <option value="OCCUPIED">OCCUPIED</option>
                                      <option value="RESERVED">RESERVED</option>
                                      <option value="MAINTENANCE">MAINTENANCE</option>
                                    </select>
                                    <button className="rounded bg-slate-700 px-3 py-2 text-white" type="submit">
                                      Save Bed
                                    </button>
                                    <button
                                      className="rounded bg-red-600 px-3 py-2 text-white"
                                      type="button"
                                      onClick={() =>
                                        void runAction(
                                          () => api(`/api/hostel/beds/${bed.id}`, "DELETE"),
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
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
