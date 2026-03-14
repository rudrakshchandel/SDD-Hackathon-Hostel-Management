import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/mcp/tools/result";

export async function getHostelSummaryForMcp() {
  const [hostel, floors, rooms, totalBeds, occupiedBeds] = await Promise.all([
    prisma.hostel.findFirst({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        address: true,
        contactNumber: true,
        timezone: true,
        status: true
      }
    }),
    prisma.floor.count(),
    prisma.room.count({ where: { status: "ACTIVE" } }),
    prisma.bed.count(),
    prisma.allocation.count({ where: { status: "ACTIVE" } })
  ]);

  const vacantBeds = Math.max(0, toNumber(totalBeds) - toNumber(occupiedBeds));

  return {
    generatedAt: new Date().toISOString(),
    hostel,
    counts: {
      floors,
      rooms,
      totalBeds,
      occupiedBeds,
      vacantBeds
    }
  };
}
