import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import type { Prisma } from "@prisma/client";
import { clampLimit, toNumber } from "@/lib/mcp/tools/result";

const sharingTypeSchema = z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY"]);
const genderSchema = z.enum(["ANY", "MALE", "FEMALE"]);
const availabilitySchema = z.enum(["vacant", "full", "all"]);

export const roomsSearchInputSchema = z.object({
  floor: z.number().int().positive().optional(),
  sharingType: sharingTypeSchema.optional(),
  ac: z.boolean().optional(),
  smoking: z.boolean().optional(),
  gender: genderSchema.optional(),
  minPrice: z.number().nonnegative().optional(),
  maxPrice: z.number().nonnegative().optional(),
  availability: availabilitySchema.optional(),
  limit: z.number().int().positive().optional()
});

export const vacancyByLocationInputSchema = z.object({
  floor: z.number().int().positive().optional()
});

type RoomRecord = {
  id: string;
  roomNumber: string;
  sharingType: "SINGLE" | "DOUBLE" | "TRIPLE" | "DORMITORY";
  status: string;
  genderRestriction: "ANY" | "MALE_ONLY" | "FEMALE_ONLY";
  basePrice: unknown;
  attributes: unknown;
  floor: {
    floorNumber: number;
    label: string | null;
  };
  beds: Array<{
    id: string;
    status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
    allocations: Array<{ id: string }>;
  }>;
};

function toRoomFlags(attributes: unknown) {
  const attr =
    attributes && typeof attributes === "object"
      ? (attributes as Record<string, unknown>)
      : {};

  return {
    ac: attr.ac === true,
    smokingAllowed: attr.smokingAllowed === true,
    wifi: attr.wifi === true,
    attachedBath: attr.attachedBath === true
  };
}

function roomCounts(room: RoomRecord) {
  const totalBeds = room.beds.length;
  const occupiedBeds = room.beds.filter((bed) => bed.allocations.length > 0).length;
  const vacantBeds = room.beds.filter(
    (bed) => bed.status === "AVAILABLE" && bed.allocations.length === 0
  ).length;

  return {
    totalBeds,
    occupiedBeds,
    vacantBeds
  };
}

function matchesAvailability(room: RoomRecord, availability: "vacant" | "full" | "all") {
  if (availability === "all") return true;
  const counts = roomCounts(room);
  if (availability === "vacant") return counts.vacantBeds > 0;
  return counts.vacantBeds === 0;
}

function toGenderRestriction(
  gender: "ANY" | "MALE" | "FEMALE" | undefined
): Prisma.EnumGenderRestrictionFilter<"Room"> | undefined {
  if (!gender || gender === "ANY") return undefined;
  if (gender === "MALE") {
    return { in: ["ANY", "MALE_ONLY"] };
  }
  return { in: ["ANY", "FEMALE_ONLY"] };
}

function sortRooms(a: RoomRecord, b: RoomRecord) {
  if (a.floor.floorNumber !== b.floor.floorNumber) {
    return a.floor.floorNumber - b.floor.floorNumber;
  }
  return a.roomNumber.localeCompare(b.roomNumber, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function mapRoom(room: RoomRecord) {
  const counts = roomCounts(room);
  const flags = toRoomFlags(room.attributes);

  return {
    id: room.id,
    roomNumber: room.roomNumber,
    sharingType: room.sharingType,
    status: room.status,
    genderRestriction: room.genderRestriction,
    basePrice: room.basePrice === null ? null : toNumber(room.basePrice),
    floor: room.floor.floorNumber,
    floorLabel: room.floor.label,
    vacancy: counts,
    flags
  };
}

async function fetchRooms(
  input: z.infer<typeof roomsSearchInputSchema>,
  maxRows: number
) {
  const availability = input.availability || "all";
  const take = clampLimit(input.limit, maxRows);
  const floorWhere: {
    floorNumber?: number;
  } = {};

  if (input.floor) {
    floorWhere.floorNumber = input.floor;
  }

  const roomsRaw = await prisma.room.findMany({
    where: {
      status: "ACTIVE",
      ...(Object.keys(floorWhere).length > 0 ? { floor: floorWhere } : {}),
      ...(input.sharingType ? { sharingType: input.sharingType } : {}),
      ...(toGenderRestriction(input.gender)
        ? { genderRestriction: toGenderRestriction(input.gender) }
        : {}),
      ...(input.ac !== undefined
        ? {
            attributes: {
              path: ["ac"],
              equals: input.ac
            }
          }
        : {}),
      ...(input.smoking !== undefined
        ? {
            attributes: {
              path: ["smokingAllowed"],
              equals: input.smoking
            }
          }
        : {}),
      ...(input.minPrice !== undefined || input.maxPrice !== undefined
        ? {
            AND: [
              ...(input.minPrice !== undefined
                ? [{ basePrice: { gte: input.minPrice } }]
                : []),
              ...(input.maxPrice !== undefined
                ? [{ basePrice: { lte: input.maxPrice } }]
                : [])
            ]
          }
        : {})
    },
    include: {
      floor: {
        select: {
          floorNumber: true,
          label: true
        }
      },
      beds: {
        select: {
          id: true,
          status: true,
          allocations: {
            where: {
              status: "ACTIVE"
            },
            select: {
              id: true
            }
          }
        }
      }
    },
    take
  });
  const rooms = roomsRaw as unknown as RoomRecord[];

  return rooms.filter((room) => matchesAvailability(room, availability)).sort(sortRooms);
}

export async function searchRoomsForMcp(
  rawInput: z.input<typeof roomsSearchInputSchema>,
  maxRows: number
) {
  const input = roomsSearchInputSchema.parse(rawInput);
  const rooms = await fetchRooms(input, maxRows);

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      ...input,
      availability: input.availability || "all"
    },
    returned: rooms.length,
    rooms: rooms.map(mapRoom)
  };
}

export async function getVacancyByLocationForMcp(
  rawInput: z.input<typeof vacancyByLocationInputSchema>,
  maxRows: number
) {
  const location = vacancyByLocationInputSchema.parse(rawInput);
  const rooms = await fetchRooms({ ...location, availability: "all" }, maxRows);

  const totals = rooms.reduce(
    (acc, room) => {
      const counts = roomCounts(room);
      acc.totalBeds += counts.totalBeds;
      acc.occupiedBeds += counts.occupiedBeds;
      acc.vacantBeds += counts.vacantBeds;
      return acc;
    },
    {
      totalBeds: 0,
      occupiedBeds: 0,
      vacantBeds: 0
    }
  );

  return {
    generatedAt: new Date().toISOString(),
    location,
    totals,
    rooms: rooms.map((room) => ({
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor.floorNumber,
      vacancy: roomCounts(room)
    }))
  };
}
