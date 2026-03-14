import { prisma } from "@/lib/prisma";

export async function getHostelTree(ownerId?: string) {
  return prisma.hostel.findFirst({
    where: ownerId
      ? {
          admins: {
            some: { id: ownerId }
          }
        }
      : {},
    orderBy: { createdAt: "asc" },
    include: {
      floors: {
        orderBy: { floorNumber: "asc" },
        include: {
          rooms: {
            orderBy: { roomNumber: "asc" },
            include: {
              beds: {
                orderBy: { bedNumber: "asc" }
              },
              electricityMeter: true
            }
          }
        }
      }
    }
  });
}

async function hasActiveResident(where: {
  bedId?: string;
  roomId?: string;
  floorId?: string;
  hostelId?: string;
}) {
  const activeAllocation = await prisma.allocation.findFirst({
    where: {
      status: "ACTIVE",
      resident: { status: "ACTIVE" },
      bed: {
        ...(where.bedId ? { id: where.bedId } : {}),
        ...(where.roomId ? { roomId: where.roomId } : {}),
        ...(where.floorId ? { room: { floorId: where.floorId } } : {}),
        ...(where.hostelId ? { room: { floor: { hostelId: where.hostelId } } } : {})
      }
    },
    select: { id: true }
  });

  return Boolean(activeAllocation);
}

export function hasActiveResidentsInBed(bedId: string) {
  return hasActiveResident({ bedId });
}

export function hasActiveResidentsInRoom(roomId: string) {
  return hasActiveResident({ roomId });
}

export function hasActiveResidentsInFloor(floorId: string) {
  return hasActiveResident({ floorId });
}

export function hasActiveResidentsInHostel(hostelId: string) {
  return hasActiveResident({ hostelId });
}
