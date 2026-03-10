import { prisma } from "@/lib/prisma";

function toNumber(value: unknown) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET() {
  const readings = await prisma.meterReading.findMany({
    include: {
      meter: {
        include: {
          room: {
            include: {
              floor: {
                include: {
                  block: { select: { id: true, name: true } }
                }
              }
            }
          }
        }
      }
    },
    orderBy: { readingDate: "desc" },
    take: 1000
  });

  const data = readings.map((reading) => ({
    id: reading.id,
    meterId: reading.meterId,
    meterNumber: reading.meter.meterNumber,
    roomNumber: reading.meter.room.roomNumber,
    floorNumber: reading.meter.room.floor.floorNumber,
    blockName: reading.meter.room.floor.block.name,
    readingDate: reading.readingDate,
    previousReading: toNumber(reading.previousReading),
    currentReading: toNumber(reading.currentReading),
    unitsConsumed: toNumber(reading.unitsConsumed),
    status: reading.status,
    notes: reading.notes
  }));

  return Response.json({ data });
}
