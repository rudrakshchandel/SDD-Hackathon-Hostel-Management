import { prisma } from "@/lib/prisma";

export async function getHostelTree() {
  return prisma.hostel.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      blocks: {
        orderBy: { name: "asc" },
        include: {
          floors: {
            orderBy: { floorNumber: "asc" },
            include: {
              rooms: {
                orderBy: { roomNumber: "asc" },
                include: {
                  beds: {
                    orderBy: { bedNumber: "asc" }
                  }
                }
              }
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
  blockId?: string;
}) {
  const activeAllocation = await prisma.allocation.findFirst({
    where: {
      status: "ACTIVE",
      resident: { status: "ACTIVE" },
      bed: {
        ...(where.bedId ? { id: where.bedId } : {}),
        ...(where.roomId ? { roomId: where.roomId } : {}),
        ...(where.floorId ? { room: { floorId: where.floorId } } : {}),
        ...(where.blockId
          ? { room: { floor: { blockId: where.blockId } } }
          : {})
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

export function hasActiveResidentsInBlock(blockId: string) {
  return hasActiveResident({ blockId });
}
