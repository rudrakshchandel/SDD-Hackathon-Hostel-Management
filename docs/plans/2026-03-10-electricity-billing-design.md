# Electricity Billing Module Design

Date: 2026-03-10

## Summary
Implement a simple, production-ready electricity billing module that supports hostel-level electricity types (no electricity, prepaid, meter-based), meter readings, bill generation, tenant (resident) split logic, and basic reports. The implementation integrates with the existing `Resident` + `Allocation` model for tenant stays and keeps UI minimal under the dashboard layout.

## Goals
- Configure hostel electricity settings.
- Record meter readings with reset/invalid handling.
- Generate room bills from meter readings.
- Split bills among actual occupants using equal or stay-duration logic.
- Provide basic reports for consumption and tenant shares.

## Non-Goals
- Deep accounting integration with invoices/payments.
- Complex billing cycles beyond the default monthly structure.
- Advanced analytics or export formats beyond simple tables/JSON.

## Architecture
- **UI**: New dashboard pages under `/electricity/*` using existing glass theme and layout.
- **API**: Next.js route handlers under `app/api/electricity`, `app/api/meters`, and `app/api/reports/electricity`.
- **Domain Logic**: Pure, testable helpers in `lib/electricity/*` for calculations and validation.
- **Data**: Prisma schema changes for electricity-specific models and hostel settings.

## Data Model Changes (Prisma)
**Hostel**
- `electricityType` enum: `NO_ELECTRICITY | PREPAID | METER_BASED`
- `electricityRatePerUnit` decimal(10,2)
- `billingCycle` enum: `MONTHLY | CUSTOM`

**New Models**
- `ElectricityMeter`
  - `id`, `roomId`, `meterNumber`, `installationDate`, `isActive`, `createdAt`, `updatedAt`
- `MeterReading`
  - `id`, `meterId`, `readingDate`, `previousReading`, `currentReading`, `unitsConsumed`, `status`, `createdById`, `notes`, `createdAt`
  - status enum: `VALID | RESET_REVIEW | CORRECTED`
- `ElectricityBill`
  - `id`, `roomId`, `billingPeriodStart`, `billingPeriodEnd`, `unitsConsumed`, `unitRate`, `totalAmount`, `status`, `createdAt`
  - status enum: `GENERATED | FINALIZED`
- `ElectricityBillShare`
  - `id`, `billId`, `residentId`, `stayDays`, `amount`

**Relations**
- `Room` -> many `ElectricityMeter` records (active meter by `isActive=true`).
- `MeterReading` -> `ElectricityMeter`.
- `ElectricityBill` -> `Room`.
- `ElectricityBillShare` -> `ElectricityBill` + `Resident`.

## Core Logic
### Meter Readings
- Previous reading is the latest **VALID** reading for the meter.
- If `current < previous`:
  - Set status to `RESET_REVIEW`.
  - Do not calculate units or bills automatically.
- First reading is treated as a baseline (units 0 unless explicitly overridden).

### Bill Generation
- Only for hostels with `electricityType = METER_BASED`.
- `unitsConsumed = currentReading - previousReading`.
- `totalAmount = unitsConsumed * unitRate` using decimal-safe math.
- If no valid reading pair, bill can still be generated with 0 units.

### Tenant (Resident) Split
- Tenant stays are derived from `Allocation` overlap with billing period.
- Stay days are **inclusive** of overlap dates.
- If multiple tenants with partial stays → `STAY_DURATION` split:
  - `share = roomBill * (tenantStayDays / totalStayDays)`
- Otherwise equal split among active tenants in that period.
- Empty beds do not share costs.
- If no tenants in the period, bill has no shares.

## API Surface
### Settings
- `GET/PUT /api/electricity/settings`

### Meters
- `POST /api/meters` (assign)
- `PUT /api/meters/:meterId` (replace/deactivate)
- `GET /api/meters?roomId=...`

### Readings
- `POST /api/electricity/readings`
- `GET /api/electricity/readings?meterId=...`
- `PATCH /api/electricity/readings/:readingId` (correct)

### Bills
- `POST /api/electricity/bills/generate` (room or hostel scope)
- `GET /api/electricity/bills/:billId`
- `PATCH /api/electricity/bills/:billId/finalize`

### Reports
- `GET /api/reports/electricity/room`
- `GET /api/reports/electricity/tenant`
- `GET /api/reports/electricity/meter`
- `GET /api/reports/electricity/monthly`

## UI Routes
- `/electricity/settings`
- `/electricity/readings`
- `/electricity/bills`
- `/electricity/reports`

UI will be simple forms + tables, respecting existing glass theme and animation classes.

## Validation & Error Handling
- Settings validation for enums and rate per unit.
- Reading validation:
  - missing previous reading -> baseline.
  - negative consumption -> `RESET_REVIEW`.
- Bill generation should reject for `NO_ELECTRICITY` and `PREPAID`.
- Deterministic calculations with decimal-safe operations.

## Testing
- Unit tests for:
  - stay-day overlap calculation
  - split logic (equal vs stay-duration)
  - reading validation and reset behavior
- Keep tests pure and fast under `tests/*.test.ts`.

## Seed Data
- Add basic meters/readings/bills to `prisma/seed.js` for demo flows.

## Rollout Notes
- Run `npx prisma generate` and `npm run db:push` after schema changes.
- Add `npm run lint` and `npm run build` checks after UI/API updates.
