# Electricity Billing Module Design (Simplified, Invoice-Centric)

## Status
Approved by user on 2026-03-09.

## Context
Integrate hostel electricity billing into the existing app. Requirements are captured in `current-bill-requirements.md` and must align with the existing Prisma + Next.js + TanStack Query stack. Electricity charges must appear in fee reports and revenue totals.

## Goals
- Support 3 electricity types at hostel level: NO_ELECTRICITY, PREPAID, METER_BASED.
- For METER_BASED: store readings, calculate room bills, split to tenants, and create invoices.
- Keep UI and API simple while being production-ready.
- Ensure electricity charges appear in existing fee and revenue reporting.

## Non-Goals
- Payment gateway integration.
- Resident self-service.
- Multi-hostel support (future scope).

## Recommended Approach
Use an invoice-centric design that keeps room-level electricity bills for auditability and creates tenant invoices for revenue/fee reporting. Avoid a separate `TenantElectricityShare` table by storing share fields directly on electricity invoices.

## Data Model Changes
### Extend Hostel
- `electricityType` enum(NO_ELECTRICITY, PREPAID, METER_BASED)
- `electricityRatePerUnit` decimal
- `billingCycle` enum(MONTHLY, CUSTOM)
- `electricitySplitMode` enum(EQUAL, STAY_DURATION)

### Add ElectricityMeter
- `id`
- `roomId`
- `meterNumber`
- `installationDate`
- `isActive`

### Add MeterReading
- `id`
- `meterId`
- `readingDate`
- `previousReading`
- `currentReading`
- `unitsConsumed`
- `status` enum(VALID, RESET_REVIEW, CORRECTED)
- `createdBy`
- `notes`

### Add ElectricityBill (room-level)
- `id`
- `roomId`
- `billingPeriodStart`
- `billingPeriodEnd`
- `unitsConsumed`
- `unitRate`
- `totalAmount`
- `status` enum(GENERATED, FINALIZED)

### Extend Invoice
- `type` enum(ROOM_RENT, ELECTRICITY)
- `roomId` (nullable, required for electricity)
- `sourceBillId` (FK to ElectricityBill)
- `stayDays` (snapshot at generation)
- `splitMode` (snapshot)
- `unitsConsumedShare` (optional, for reporting)

### Uniqueness & Integrity
- Unique on `(roomId, billingPeriodStart, billingPeriodEnd)` for ElectricityBill.
- Unique on `(sourceBillId, residentId)` for electricity invoices.
- Electricity invoices are read-only via API; edits happen via bill regeneration.

## Core Flow
1. Admin configures hostel electricity settings.
2. Admin assigns or replaces a meter per room.
3. Admin adds meter readings.
4. System calculates units or flags reset/invalid.
5. Admin generates bill for a room + period.
6. System creates ElectricityBill + per-tenant ELECTRICITY invoices.
7. Reports use invoices for revenue/fees and electricity tables for usage history.

## Billing Logic
- `unitsConsumed = currentReading - previousReading`
- If negative: mark as RESET_REVIEW and do not auto-bill.
- `totalAmount = unitsConsumed * unitRate`
- Split mode:
  - EQUAL: divide among active tenants in billing period.
  - STAY_DURATION: `tenantShare = roomBill * (tenantStayDays / totalStayDays)`
- No tenants: bill can exist with zero invoices.

## Tenant Stay Calculation
- Use allocation overlap with billing period.
- Inclusive day count.
- Snapshot stayDays on each electricity invoice.

## API Surface
- `GET/PUT /api/hostel/electricity-settings`
- `POST /api/rooms/:roomId/meter`
- `POST /api/meters/:meterId/readings`
- `GET /api/meters/:meterId/readings`
- `POST /api/electricity/bills` (room + period)
- `GET /api/electricity/bills/:billId`
- `POST /api/electricity/bills/:billId/finalize`
- Reports:
  - `/api/reports/electricity/room`
  - `/api/reports/electricity/tenant`
  - `/api/reports/electricity/meter`
  - `/api/reports/electricity/monthly`

## UI Integration
- Hostel Settings: add electricity type, rate, billing cycle, split mode.
- Meter screen: assign/update meter and add readings.
- Bill details: show room bill and tenant electricity invoices.
- Reports: simple tables for usage and billing summaries.

## Error Handling & Safeguards
- Prevent electricity bill generation when hostel type is NO_ELECTRICITY or PREPAID.
- Require admin review for reset/invalid readings.
- Prevent regeneration if bill is FINALIZED.
- Ensure electricity invoices are created once per bill + resident.

## Testing Scope
- Unit tests for:
  - Units calculation (valid vs reset)
  - Stay overlap calculation
  - Equal vs stay-duration split
  - Bill generation with zero tenants
- API tests for bill generation and reading entry validation.

## Open Questions
- Whether to allow billing on first baseline reading (default: no).
- Whether to expose electricity invoices in existing revenue UI or separate tab.