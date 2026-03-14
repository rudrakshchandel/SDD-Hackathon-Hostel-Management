import { NextResponse } from "next/server";
import {
  getHostelElectricitySettings,
  updateHostelElectricitySettings
} from "@/lib/electricity/service";

const ELECTRICITY_TYPES = ["NO_ELECTRICITY", "PREPAID", "METER_BASED"] as const;
const BILLING_CYCLES = ["MONTHLY", "CUSTOM"] as const;
const SPLIT_MODES = ["EQUAL", "STAY_DURATION"] as const;

export async function GET() {
  const data = await getHostelElectricitySettings();
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const body = await request.json();

  const electricityType = body.electricityType;
  const billingCycle = body.billingCycle;
  const electricitySplitMode = body.electricitySplitMode;

  if (electricityType && !ELECTRICITY_TYPES.includes(electricityType)) {
    return NextResponse.json({ error: "Invalid electricityType" }, { status: 400 });
  }
  if (billingCycle && !BILLING_CYCLES.includes(billingCycle)) {
    return NextResponse.json({ error: "Invalid billingCycle" }, { status: 400 });
  }
  if (electricitySplitMode && !SPLIT_MODES.includes(electricitySplitMode)) {
    return NextResponse.json({ error: "Invalid electricitySplitMode" }, { status: 400 });
  }

  let electricityRatePerUnit: number | null | undefined = undefined;
  if (body.electricityRatePerUnit !== undefined) {
    if (body.electricityRatePerUnit === null || body.electricityRatePerUnit === "") {
      electricityRatePerUnit = null;
    } else {
      const parsed = Number(body.electricityRatePerUnit);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "electricityRatePerUnit must be a positive number" },
          { status: 400 }
        );
      }
      electricityRatePerUnit = parsed;
    }
  }

  await updateHostelElectricitySettings({
    electricityType,
    billingCycle,
    electricitySplitMode,
    electricityRatePerUnit
  });

  const data = await getHostelElectricitySettings();
  return NextResponse.json({ data });
}
