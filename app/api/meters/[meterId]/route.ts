import { NextResponse } from "next/server";
import { updateMeter } from "@/lib/electricity/service";

export async function PUT(
  request: Request,
  { params }: { params: { meterId: string } }
) {
  const body = await request.json();
  const installationDate = body.installationDate ? new Date(body.installationDate) : undefined;

  if (installationDate && Number.isNaN(installationDate.getTime())) {
    return NextResponse.json({ error: "Invalid installationDate" }, { status: 400 });
  }

  const meter = await updateMeter({
    meterId: params.meterId,
    meterNumber: body.meterNumber ? String(body.meterNumber) : undefined,
    installationDate,
    isActive: body.isActive === undefined ? undefined : Boolean(body.isActive)
  });

  return NextResponse.json({ data: meter });
}
