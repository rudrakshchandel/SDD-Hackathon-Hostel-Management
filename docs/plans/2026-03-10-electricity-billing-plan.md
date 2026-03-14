# Electricity Billing Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a full-stack electricity billing module (settings, meters, readings, bills, reports) integrated with existing hostel data.

**Architecture:** Add electricity tables and hostel settings in Prisma, expose thin API routes that delegate to pure `lib/electricity/*` helpers, and build simple dashboard pages under `/electricity/*` using existing UI patterns.

**Tech Stack:** Next.js App Router, Prisma, React Query, Tailwind CSS, Vitest.

---

### Task 1: Add stay-overlap calculation helper

**Files:**
- Create: `lib/electricity/date-utils.ts`
- Test: `tests/electricity/date-utils.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { calculateOverlapDays } from "@/lib/electricity/date-utils";

describe("calculateOverlapDays", () => {
  it("returns inclusive overlap days", () => {
    const overlap = calculateOverlapDays(
      new Date("2026-03-01"),
      new Date("2026-03-31"),
      new Date("2026-03-10"),
      new Date("2026-03-12")
    );
    expect(overlap).toBe(3);
  });

  it("returns 0 when no overlap", () => {
    const overlap = calculateOverlapDays(
      new Date("2026-03-01"),
      new Date("2026-03-05"),
      new Date("2026-03-10"),
      new Date("2026-03-12")
    );
    expect(overlap).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/electricity/date-utils.test.ts`
Expected: FAIL with missing module/function.

**Step 3: Write minimal implementation**

```ts
export function calculateOverlapDays(
  periodStart: Date,
  periodEnd: Date,
  stayStart: Date,
  stayEnd: Date
) {
  const start = stayStart > periodStart ? stayStart : periodStart;
  const end = stayEnd < periodEnd ? stayEnd : periodEnd;
  if (start > end) return 0;
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/electricity/date-utils.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/electricity/date-utils.ts tests/electricity/date-utils.test.ts
git commit -m "feat: add stay overlap utility"
```

---

### Task 2: Add split calculation helper

**Files:**
- Create: `lib/electricity/split.ts`
- Test: `tests/electricity/split.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { calculateShares } from "@/lib/electricity/split";

describe("calculateShares", () => {
  it("splits equally when stays are full", () => {
    const shares = calculateShares(1000, [30, 30, 30]);
    expect(shares).toEqual([333.33, 333.33, 333.34]);
  });

  it("splits by stay duration when partial", () => {
    const shares = calculateShares(900, [10, 20]);
    expect(shares).toEqual([300, 600]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/electricity/split.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
export function calculateShares(totalAmount: number, stayDays: number[]) {
  const totalDays = stayDays.reduce((sum, days) => sum + days, 0);
  if (!totalDays) return stayDays.map(() => 0);

  const raw = stayDays.map((days) => (totalAmount * days) / totalDays);
  const rounded = raw.map((value) => Math.floor(value * 100) / 100);
  const delta = Number((totalAmount - rounded.reduce((a, b) => a + b, 0)).toFixed(2));

  if (delta !== 0 && rounded.length > 0) {
    rounded[rounded.length - 1] = Number((rounded[rounded.length - 1] + delta).toFixed(2));
  }

  return rounded;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/electricity/split.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/electricity/split.ts tests/electricity/split.test.ts
git commit -m "feat: add bill share calculation"
```

---

### Task 3: Add reading validation helper

**Files:**
- Create: `lib/electricity/readings.ts`
- Test: `tests/electricity/readings.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { evaluateReading } from "@/lib/electricity/readings";

describe("evaluateReading", () => {
  it("flags resets when current < previous", () => {
    const result = evaluateReading(120, 100);
    expect(result.status).toBe("RESET_REVIEW");
  });

  it("calculates units for valid reading", () => {
    const result = evaluateReading(150, 100);
    expect(result.status).toBe("VALID");
    expect(result.units).toBe(50);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/electricity/readings.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```ts
type ReadingStatus = "VALID" | "RESET_REVIEW";

type ReadingEvaluation = {
  status: ReadingStatus;
  units: number | null;
};

export function evaluateReading(current: number, previous: number): ReadingEvaluation {
  if (current < previous) {
    return { status: "RESET_REVIEW", units: null };
  }
  return { status: "VALID", units: current - previous };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/electricity/readings.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/electricity/readings.ts tests/electricity/readings.test.ts
git commit -m "feat: add meter reading evaluation"
```

---

### Task 4: Extend Prisma schema for electricity models

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.js`

**Step 1: Write failing test**

Skip (schema change).

**Step 2: Apply schema changes**

Add enums and models:

```prisma
enum HostelElectricityType {
  NO_ELECTRICITY
  PREPAID
  METER_BASED
}

enum HostelBillingCycle {
  MONTHLY
  CUSTOM
}

enum MeterReadingStatus {
  VALID
  RESET_REVIEW
  CORRECTED
}

enum ElectricityBillStatus {
  GENERATED
  FINALIZED
}
```

```prisma
model ElectricityMeter {
  id               String   @id @default(cuid())
  roomId           String
  meterNumber      String
  installationDate DateTime
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  room             Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  readings         MeterReading[]

  @@index([roomId, isActive])
  @@unique([roomId, meterNumber])
}

model MeterReading {
  id               String             @id @default(cuid())
  meterId          String
  readingDate      DateTime
  previousReading  Decimal?           @db.Decimal(10, 2)
  currentReading   Decimal            @db.Decimal(10, 2)
  unitsConsumed    Decimal?           @db.Decimal(10, 2)
  status           MeterReadingStatus @default(VALID)
  createdById      String?
  notes            String?
  createdAt        DateTime           @default(now())
  meter            ElectricityMeter   @relation(fields: [meterId], references: [id], onDelete: Cascade)
  createdBy        AdminUser?         @relation(fields: [createdById], references: [id], onDelete: SetNull)

  @@index([meterId, readingDate])
  @@index([status])
}

model ElectricityBill {
  id                 String                 @id @default(cuid())
  roomId             String
  billingPeriodStart DateTime
  billingPeriodEnd   DateTime
  unitsConsumed      Decimal                @db.Decimal(10, 2)
  unitRate           Decimal                @db.Decimal(10, 2)
  totalAmount        Decimal                @db.Decimal(10, 2)
  status             ElectricityBillStatus  @default(GENERATED)
  createdAt          DateTime               @default(now())
  room               Room                   @relation(fields: [roomId], references: [id], onDelete: Cascade)
  shares             ElectricityBillShare[]

  @@index([roomId, billingPeriodStart, billingPeriodEnd])
}

model ElectricityBillShare {
  id         String           @id @default(cuid())
  billId     String
  residentId String
  stayDays   Int
  amount     Decimal          @db.Decimal(10, 2)
  bill       ElectricityBill  @relation(fields: [billId], references: [id], onDelete: Cascade)
  resident   Resident         @relation(fields: [residentId], references: [id], onDelete: Restrict)

  @@index([billId])
  @@index([residentId])
}
```

Update `Hostel`:

```prisma
  electricityType       HostelElectricityType @default(NO_ELECTRICITY)
  electricityRatePerUnit Decimal?             @db.Decimal(10, 2)
  billingCycle          HostelBillingCycle    @default(MONTHLY)
```

**Step 3: Update seed data**

Add sample meters/readings and settings to `prisma/seed.js` (simple sample values).

**Step 4: Run Prisma generate and push**

Run: `npx prisma generate`
Expected: Prisma client generated.

Run: `npm run db:push`
Expected: Schema sync completed.

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/seed.js
git commit -m "feat: add electricity schema"
```

---

### Task 5: Add electricity service helpers (DB-aware)

**Files:**
- Create: `lib/electricity/service.ts`
- Modify: `lib/electricity/index.ts` (barrel export)

**Step 1: Write failing test**

Skip (DB-aware logic). Focus tests remain in pure helpers.

**Step 2: Implement minimal service functions**

```ts
export async function getHostelElectricitySettings() {}
export async function updateHostelElectricitySettings(input) {}
export async function assignMeterToRoom(input) {}
export async function recordMeterReading(input) {}
export async function generateRoomBill(input) {}
export async function generateHostelBills(input) {}
```

**Step 3: Manual smoke check**

Run: `npm run lint`
Expected: no type errors.

**Step 4: Commit**

```bash
git add lib/electricity/service.ts lib/electricity/index.ts
git commit -m "feat: add electricity service layer"
```

---

### Task 6: Implement API routes

**Files:**
- Create: `app/api/electricity/settings/route.ts`
- Create: `app/api/electricity/readings/route.ts`
- Create: `app/api/electricity/readings/[readingId]/route.ts`
- Create: `app/api/electricity/bills/generate/route.ts`
- Create: `app/api/electricity/bills/[billId]/route.ts`
- Create: `app/api/electricity/bills/[billId]/finalize/route.ts`
- Create: `app/api/meters/route.ts`
- Create: `app/api/meters/[meterId]/route.ts`
- Create: `app/api/reports/electricity/room/route.ts`
- Create: `app/api/reports/electricity/tenant/route.ts`
- Create: `app/api/reports/electricity/meter/route.ts`
- Create: `app/api/reports/electricity/monthly/route.ts`

**Step 1: Write failing test**

Skip (route handlers). Validate manually by running `npm run lint`.

**Step 2: Implement route handlers**

Use `NextResponse.json({ data })` with simple validation and call into `lib/electricity/service`.

**Step 3: Manual smoke check**

Run: `npm run lint`
Expected: no lint/type errors.

**Step 4: Commit**

```bash
git add app/api/electricity app/api/meters app/api/reports/electricity
git commit -m "feat: add electricity api routes"
```

---

### Task 7: Add dashboard pages and nav entry

**Files:**
- Create: `app/(dashboard)/electricity/settings/page.tsx`
- Create: `app/(dashboard)/electricity/readings/page.tsx`
- Create: `app/(dashboard)/electricity/bills/page.tsx`
- Create: `app/(dashboard)/electricity/reports/page.tsx`
- Create: `app/(dashboard)/electricity/readings/readings-client.tsx`
- Create: `app/(dashboard)/electricity/settings/settings-client.tsx`
- Create: `app/(dashboard)/electricity/bills/bills-client.tsx`
- Create: `app/(dashboard)/electricity/reports/reports-client.tsx`
- Modify: `app/components/top-nav.tsx`

**Step 1: Write failing test**

Skip (UI). Ensure UI builds via `npm run build` later.

**Step 2: Implement UI pages**

- Simple forms/tables using existing glass classes.
- React Query to call API routes.
- Hide billing UI for `NO_ELECTRICITY` or `PREPAID`.

**Step 3: Manual smoke check**

Run: `npm run lint`
Expected: no lint/type errors.

**Step 4: Commit**

```bash
git add app/(dashboard)/electricity app/components/top-nav.tsx
git commit -m "feat: add electricity dashboard pages"
```

---

### Task 8: Add final verification tasks

**Files:**
- None (verification only)

**Step 1: Run tests**

Run: `npm test`
Expected: PASS

**Step 2: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

Skip if user wants to batch commits later.

---

## Notes
- Keep all API handlers thin and delegate calculation to `lib/electricity/*`.
- Use decimal-safe math where amounts are computed, round to 2 decimals.
- Respect existing glass theme and animation classes.
- If the user wants to avoid commits, skip Step 5 in each task.
