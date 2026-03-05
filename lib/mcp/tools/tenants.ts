import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { maskContact, maskEmail, maskIdNumber } from "@/lib/mcp/redaction";
import { clampLimit } from "@/lib/mcp/tools/result";

export const tenantsListInputSchema = z.object({
  block: z.string().trim().min(1).optional(),
  floor: z.number().int().positive().optional(),
  roomNumber: z.string().trim().min(1).optional(),
  status: z.enum(["ACTIVE", "PENDING", "VACATED"]).optional(),
  limit: z.number().int().positive().optional()
});

export async function listTenantsForMcp(
  rawInput: z.input<typeof tenantsListInputSchema>,
  maxRows: number
) {
  const input = tenantsListInputSchema.parse(rawInput);
  const take = clampLimit(input.limit, maxRows);
  const bedRoomWhere: {
    roomNumber?: {
      equals: string;
      mode: "insensitive";
    };
    floor?: {
      floorNumber?: number;
      block?: {
        name: {
          equals: string;
          mode: "insensitive";
        };
      };
    };
  } = {};

  if (input.roomNumber) {
    bedRoomWhere.roomNumber = {
      equals: input.roomNumber,
      mode: "insensitive"
    };
  }

  if (input.floor || input.block) {
    bedRoomWhere.floor = {};
  }

  if (input.floor && bedRoomWhere.floor) {
    bedRoomWhere.floor.floorNumber = input.floor;
  }

  if (input.block && bedRoomWhere.floor) {
    bedRoomWhere.floor.block = {
      name: {
        equals: input.block,
        mode: "insensitive"
      }
    };
  }

  const allocations = await prisma.allocation.findMany({
    where: {
      status: "ACTIVE",
      ...(input.status
        ? {
            resident: {
              status: input.status
            }
          }
        : {}),
      ...(Object.keys(bedRoomWhere).length > 0
        ? {
            bed: {
              room: bedRoomWhere
            }
          }
        : {})
    },
    select: {
      id: true,
      status: true,
      startDate: true,
      resident: {
        select: {
          id: true,
          fullName: true,
          gender: true,
          status: true,
          contact: true,
          email: true,
          idProofType: true,
          idProofNumber: true,
          invoices: {
            orderBy: { dueDate: "desc" },
            take: 1,
            select: {
              dueDate: true,
              status: true
            }
          }
        }
      },
      bed: {
        select: {
          id: true,
          bedNumber: true,
          room: {
            select: {
              roomNumber: true,
              floor: {
                select: {
                  floorNumber: true,
                  block: {
                    select: {
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      startDate: "desc"
    },
    take
  });

  return {
    generatedAt: new Date().toISOString(),
    returned: allocations.length,
    tenants: allocations.map((allocation) => ({
      allocationId: allocation.id,
      allocationStatus: allocation.status,
      startDate: allocation.startDate.toISOString(),
      residentId: allocation.resident.id,
      fullName: allocation.resident.fullName,
      gender: allocation.resident.gender,
      status: allocation.resident.status,
      email: maskEmail(allocation.resident.email),
      contact: maskContact(allocation.resident.contact),
      idProofType: allocation.resident.idProofType,
      idProofNumber: maskIdNumber(allocation.resident.idProofNumber),
      block: allocation.bed.room.floor.block.name,
      floor: allocation.bed.room.floor.floorNumber,
      roomNumber: allocation.bed.room.roomNumber,
      bedNumber: allocation.bed.bedNumber,
      latestInvoiceDueDate: allocation.resident.invoices[0]?.dueDate
        ? allocation.resident.invoices[0].dueDate.toISOString()
        : null,
      latestInvoiceStatus: allocation.resident.invoices[0]?.status || null
    }))
  };
}
