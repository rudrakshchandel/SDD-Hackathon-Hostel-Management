# Electricity Billing Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix billing-period unit calculation, propagate reading corrections, scope hostel billing by hostel, and keep units consumed even when rate is zero.

**Architecture:** Add small pure helpers in `lib/electricity` for period unit calculation, correction chain recomputation, and room filtering. Use these helpers in service/API to keep Prisma calls simple and deterministic. Keep changes minimal and covered by unit tests.

**Tech Stack:** Next.js App Router, Prisma, Vitest.

---

### Task 1: Period Units Calculation (TDD)

**Files:**
- Modify: `lib/electricity/readings.ts`
- Modify: `lib/electricity/service.ts`
- Test: `tests/electricity/period-units.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { calculatePeriodUnits } from "@/lib/electricity/readings";

function d(value: string) {
  return new Date(value);
}

describe("calculatePeriodUnits", () => {
  it("uses baseline before period and latest reading within period", () => {
    const readings = [
      { readingDate: d("2026-02-28"), currentReading: 100, status: "VALID" },
      { readingDate: d("2026-03-15"), currentReading: 140, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(40);
  });

  it("returns 0 when there is no baseline before period", () => {
    const readings = [
      { readingDate: d("2026-03-05"), currentReading: 150, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(0);
  });

  it("ignores readings after period end", () => {
    const readings = [
      { readingDate: d("2026-02-28"), currentReading: 80, status: "VALID" },
      { readingDate: d("2026-04-02"), currentReading: 110, status: "VALID" }
    ];

    const units = calculatePeriodUnits(readings, d("2026-03-01"), d("2026-03-31"));
    expect(units).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/electricity/period-units.test.ts`
Expected: FAIL (missing `calculatePeriodUnits` export).

**Step 3: Write minimal implementation**

```typescript
export type ReadingStatus = "VALID" | "RESET_REVIEW" | "CORRECTED";

export type ReadingLike = {
  readingDate: Date;
  currentReading: number;
  status: ReadingStatus;
};

const VALID_STATUSES: ReadingStatus[] = ["VALID", "CORRECTED"];

export function calculatePeriodUnits(
  readings: ReadingLike[],
  periodStart: Date,
  periodEnd: Date
) {
  const valid = readings
    .filter((reading) => VALID_STATUSES.includes(reading.status))
    .filter((reading) => reading.readingDate <= periodEnd)
    .sort((a, b) => a.readingDate.getTime() - b.readingDate.getTime());

  if (valid.length === 0) return 0;

  const endReading = valid[valid.length - 1];
  if (endReading.readingDate < periodStart) return 0;

  const baseline = [...valid]
    .reverse()
    .find((reading) => reading.readingDate < periodStart);

  if (!baseline) return 0;

  const delta = endReading.currentReading - baseline.currentReading;
  return delta > 0 ? Number(delta.toFixed(2)) : 0;
}
```

Update `lib/electricity/service.ts` to fetch valid readings for the meter (<= periodEnd) and compute units using `calculatePeriodUnits` instead of only using the latest reading. Remove the special-case that zeroes `unitsConsumed` when rate is 0.

**Step 4: Run test to verify it passes**

Run: `npm test tests/electricity/period-units.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/electricity/period-units.test.ts lib/electricity/readings.ts lib/electricity/service.ts
git commit -m "fix: calculate period units from baseline readings"
```

---

### Task 2: Reading Correction Cascade (TDD)

**Files:**
- Modify: `lib/electricity/readings.ts`
- Modify: `app/api/electricity/readings/[readingId]/route.ts`
- Test: `tests/electricity/reading-corrections.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { recomputeReadingChain } from "@/lib/electricity/readings";

function d(value: string) {
  return new Date(value);
}

describe("recomputeReadingChain", () => {
  it("recomputes subsequent readings from corrected value", () => {
    const readings = [
      { id: "r1", readingDate: d("2026-03-05"), currentReading: 140 },
      { id: "r2", readingDate: d("2026-03-10"), currentReading: 160 }
    ];

    const result = recomputeReadingChain({
      previousReading: 100,
      readings,
      correctedId: "r1"
    });

    expect(result).toEqual([
      { id: "r1", previousReading: 100, unitsConsumed: 40, status: "CORRECTED" },
      { id: "r2", previousReading: 140, unitsConsumed: 20, status: "VALID" }
    ]);
  });

  it("marks reset review when current < previous", () => {
    const readings = [
      { id: "r1", readingDate: d("2026-03-05"), currentReading: 90 }
    ];

    const result = recomputeReadingChain({
      previousReading: 100,
      readings,
      correctedId: "r1"
    });

    expect(result).toEqual([
      { id: "r1", previousReading: 100, unitsConsumed: 0, status: "RESET_REVIEW" }
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/electricity/reading-corrections.test.ts`
Expected: FAIL (missing `recomputeReadingChain` export).

**Step 3: Write minimal implementation**

```typescript
export function recomputeReadingChain(input: {
  previousReading: number;
  readings: { id: string; readingDate: Date; currentReading: number }[];
  correctedId: string;
}) {
  const sorted = [...input.readings].sort(
    (a, b) => a.readingDate.getTime() - b.readingDate.getTime()
  );

  let previous = input.previousReading;

  return sorted.map((reading) => {
    if (reading.currentReading < previous) {
      return {
        id: reading.id,
        previousReading: previous,
        unitsConsumed: 0,
        status: "RESET_REVIEW" as const
      };
    }

    const unitsConsumed = Number((reading.currentReading - previous).toFixed(2));
    const status = reading.id === input.correctedId ? "CORRECTED" : "VALID";
    const result = {
      id: reading.id,
      previousReading: previous,
      unitsConsumed,
      status
    } as const;

    previous = reading.currentReading;
    return result;
  });
}
```

Update `app/api/electricity/readings/[readingId]/route.ts` to:
- Fetch the previous valid/corrected reading before the effective date.
- Fetch all readings for that meter from effective date forward (order asc).
- Use `recomputeReadingChain` to compute new previous/units/status.
- Update all affected readings in a Prisma transaction.

**Step 4: Run test to verify it passes**

Run: `npm test tests/electricity/reading-corrections.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/electricity/reading-corrections.test.ts lib/electricity/readings.ts app/api/electricity/readings/[readingId]/route.ts
git commit -m "fix: recompute meter reading chain on correction"
```

---

### Task 3: Hostel Room Scoping Helper (TDD)

**Files:**
- Create: `lib/electricity/room-filter.ts`
- Modify: `lib/electricity/service.ts`
- Test: `tests/electricity/room-filter.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { buildHostelRoomFilter } from "@/lib/electricity/room-filter";

describe("buildHostelRoomFilter", () => {
  it("scopes active rooms to a hostel id", () => {
    const filter = buildHostelRoomFilter("hostel-1");
    expect(filter).toEqual({
      status: "ACTIVE",
      floor: { block: { hostelId: "hostel-1" } }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test tests/electricity/room-filter.test.ts`
Expected: FAIL (missing `buildHostelRoomFilter` export).

**Step 3: Write minimal implementation**

```typescript
export function buildHostelRoomFilter(hostelId: string) {
  return {
    status: "ACTIVE" as const,
    floor: { block: { hostelId } }
  };
}
```

Update `lib/electricity/service.ts` to use `buildHostelRoomFilter(hostel.id)` for `prisma.room.findMany` in `generateHostelBills`.

**Step 4: Run test to verify it passes**

Run: `npm test tests/electricity/room-filter.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/electricity/room-filter.test.ts lib/electricity/room-filter.ts lib/electricity/service.ts
git commit -m "fix: scope hostel bills to hostel rooms"
```

---

### Task 4: Full Test Run

**Step 1: Run full test suite**

Run: `npm test`
Expected: PASS.

**Step 2: Commit (if any follow-ups)**

```bash
git status
# if any changes remain
git add <files>
git commit -m "chore: stabilize electricity billing fixes"
```
