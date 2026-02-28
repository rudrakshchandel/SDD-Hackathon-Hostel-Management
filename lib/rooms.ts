import { prisma } from "@/lib/prisma";

type Gender = "MALE" | "FEMALE" | "OTHER";
type ResidentStatus = "ACTIVE" | "PENDING" | "VACATED";
type SharingType = "SINGLE" | "DOUBLE" | "TRIPLE" | "DORMITORY";
type GenderRestriction = "ANY" | "MALE_ONLY" | "FEMALE_ONLY";
type BedStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

type ActiveAllocationWithResident = {
  id: string;
  resident: {
    id: string;
    fullName: string;
    gender: Gender;
    status: ResidentStatus;
    contact: string | null;
  };
};

type RoomWithBedsAndAllocations = {
  id: string;
  roomNumber: string;
  sharingType: SharingType;
  status: string;
  genderRestriction: GenderRestriction;
  basePrice: unknown;
  attributes: unknown;
  floor: {
    id: string;
    floorNumber: number;
    label: string | null;
    block: {
      id: string;
      name: string;
    };
  };
  beds: Array<{
    id: string;
    bedNumber: string;
    status: BedStatus;
    allocations: ActiveAllocationWithResident[];
  }>;
};

export function parseBooleanFilter(value: string | null) {
  if (value === null || value === "" || value.toLowerCase() === "any") {
    return undefined;
  }
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  return undefined;
}

function toNumberOrUndefined(input: string | null) {
  if (!input) return undefined;
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function roomHasAnyVacantBed(room: RoomWithBedsAndAllocations) {
  return room.beds.some((bed) => bed.allocations.length === 0);
}

function getRoomCounts(room: RoomWithBedsAndAllocations) {
  const totalBeds = room.beds.length;
  const occupiedBeds = room.beds.filter((bed) => bed.allocations.length > 0).length;
  return {
    totalBeds,
    occupiedBeds,
    vacantBeds: Math.max(0, totalBeds - occupiedBeds)
  };
}

function roomToListDto(room: RoomWithBedsAndAllocations) {
  const counts = getRoomCounts(room);
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    sharingType: room.sharingType,
    status: room.status,
    genderRestriction: room.genderRestriction,
    basePrice: room.basePrice ? Number(room.basePrice) : null,
    attributes: room.attributes,
    block: room.floor.block,
    floor: {
      id: room.floor.id,
      floorNumber: room.floor.floorNumber,
      label: room.floor.label
    },
    counts,
    availableBeds: room.beds
      .filter((bed) => bed.allocations.length === 0)
      .map((bed) => ({ id: bed.id, bedNumber: bed.bedNumber }))
  };
}

function roomToDetailDto(room: RoomWithBedsAndAllocations) {
  const counts = getRoomCounts(room);
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    sharingType: room.sharingType,
    status: room.status,
    genderRestriction: room.genderRestriction,
    basePrice: room.basePrice ? Number(room.basePrice) : null,
    attributes: room.attributes,
    block: room.floor.block,
    floor: {
      id: room.floor.id,
      floorNumber: room.floor.floorNumber,
      label: room.floor.label
    },
    counts,
    beds: room.beds.map((bed) => ({
      id: bed.id,
      bedNumber: bed.bedNumber,
      status: bed.status,
      occupied: bed.allocations.length > 0,
      occupants: bed.allocations.map((allocation) => ({
        allocationId: allocation.id,
        resident: allocation.resident
      }))
    }))
  };
}

export async function searchRooms(query: URLSearchParams) {
  const sharingType = query.get("sharingType");
  const floorId = query.get("floorId");
  const blockId = query.get("blockId");
  const gender = query.get("gender");
  const availability = query.get("availability");
  const ac = parseBooleanFilter(query.get("ac"));
  const smoking = parseBooleanFilter(query.get("smoking"));
  const minPrice = toNumberOrUndefined(query.get("minPrice"));
  const maxPrice = toNumberOrUndefined(query.get("maxPrice"));

  const rooms = (await prisma.room.findMany({
    where: {
      status: "ACTIVE",
      ...(sharingType ? { sharingType: sharingType as SharingType } : {}),
      ...(floorId ? { floorId } : {}),
      ...(blockId ? { floor: { blockId } } : {}),
      ...(gender && gender !== "ANY"
        ? {
            genderRestriction: {
              in: [
                "ANY",
                `${gender}_ONLY` as GenderRestriction
              ]
            }
          }
        : {}),
      ...(ac !== undefined
        ? {
            attributes: {
              path: ["ac"],
              equals: ac
            }
          }
        : {}),
      ...(smoking !== undefined
        ? {
            attributes: {
              path: ["smokingAllowed"],
              equals: smoking
            }
          }
        : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            AND: [
              ...(minPrice !== undefined ? [{ basePrice: { gte: minPrice } }] : []),
              ...(maxPrice !== undefined ? [{ basePrice: { lte: maxPrice } }] : [])
            ]
          }
        : {})
    },
    include: {
      floor: {
        include: {
          block: {
            select: { id: true, name: true }
          }
        }
      },
      beds: {
        orderBy: { bedNumber: "asc" },
        include: {
          allocations: {
            where: {
              status: "ACTIVE",
              resident: { status: "ACTIVE" }
            },
            select: {
              id: true,
              resident: {
                select: {
                  id: true,
                  fullName: true,
                  gender: true,
                  status: true,
                  contact: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ roomNumber: "asc" }]
  })) as RoomWithBedsAndAllocations[];

  const filteredByAvailability = rooms.filter((room) => {
    if (!availability || availability === "all") return true;
    const hasVacant = roomHasAnyVacantBed(room);
    if (availability === "vacant") return hasVacant;
    if (availability === "full") return !hasVacant;
    return true;
  });

  return filteredByAvailability
    .sort((a, b) => {
      const blockCmp = a.floor.block.name.localeCompare(b.floor.block.name);
      if (blockCmp !== 0) return blockCmp;
      if (a.floor.floorNumber !== b.floor.floorNumber) {
        return a.floor.floorNumber - b.floor.floorNumber;
      }
      return a.roomNumber.localeCompare(b.roomNumber, undefined, {
        numeric: true,
        sensitivity: "base"
      });
    })
    .map(roomToListDto);
}

export async function getRoomDetail(roomId: string) {
  const room = (await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      floor: {
        include: {
          block: {
            select: { id: true, name: true }
          }
        }
      },
      beds: {
        orderBy: { bedNumber: "asc" },
        include: {
          allocations: {
            where: {
              status: "ACTIVE",
              resident: { status: "ACTIVE" }
            },
            select: {
              id: true,
              resident: {
                select: {
                  id: true,
                  fullName: true,
                  gender: true,
                  status: true,
                  contact: true
                }
              }
            }
          }
        }
      }
    }
  })) as RoomWithBedsAndAllocations | null;

  if (!room) return null;
  return roomToDetailDto(room);
}
