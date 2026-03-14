import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: { billId: string } }
) {
  const existing = await prisma.electricityBill.findUnique({
    where: { id: params.billId }
  });

  if (!existing) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const bill = await prisma.electricityBill.update({
    where: { id: params.billId },
    data: { status: "FINALIZED" }
  });

  return NextResponse.json({ data: bill });
}
