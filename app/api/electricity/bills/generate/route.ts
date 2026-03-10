import { NextResponse } from "next/server";
import { generateHostelBills, generateRoomBill } from "@/lib/electricity/service";

export async function POST(request: Request) {
  const body = await request.json();
  const periodStart = body.periodStart ? new Date(body.periodStart) : null;
  const periodEnd = body.periodEnd ? new Date(body.periodEnd) : null;

  if (!periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "periodStart and periodEnd are required" },
      { status: 400 }
    );
  }

  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json({ error: "Invalid billing period dates" }, { status: 400 });
  }

  if (body.roomId) {
    const result = await generateRoomBill({
      roomId: String(body.roomId),
      periodStart,
      periodEnd,
      splitMode: body.splitMode
    });
    return NextResponse.json({ data: result }, { status: 201 });
  }

  const result = await generateHostelBills({ periodStart, periodEnd });
  return NextResponse.json({ data: result }, { status: 201 });
}
