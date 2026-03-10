# Current Bill Requirements

## Prompt
Build a simple hostel electricity billing module.

Goal:
Implement electricity billing for hostel rooms with support for:
1. No electricity
2. Prepaid electricity
3. Meter-based electricity billing

Keep the implementation simple, clean, and production-ready.

================================
BUSINESS RULES
================================

1. Electricity Types
Support 3 electricity types at hostel level:

- NO_ELECTRICITY
  - Electricity is not handled in the app
  - No meter readings
  - No electricity bills

- PREPAID
  - Electricity is handled outside the app
  - App should only show: "Electricity Type: Prepaid"
  - Do not store meter readings
  - Do not generate electricity bills
  - Do not show electricity usage

- METER_BASED
  - Each room can have a meter
  - Admin manually enters meter readings
  - System calculates room electricity bill
  - System splits room bill among tenants

2. Billing Logic
For METER_BASED:
- units_consumed = current_reading - previous_reading
- total_amount = units_consumed * unit_rate

3. Tenant Bill Split
Support both:
- Equal split among active tenants in the room
- Split by stay duration

Stay-duration formula:
tenant_share = room_bill * (tenant_stay_days / total_stay_days_of_all_tenants)

4. Partial Occupancy
- Empty beds should not share electricity cost
- Bill is divided only among actual tenants staying in the room
- If only 1 tenant stayed in a 3-sharing room, that tenant pays full room electricity bill

5. Billing Cycle
- Default monthly billing
- Keep structure flexible to support custom billing cycle later

6. Reporting
Provide basic reports for:
- Room electricity consumption
- Tenant electricity bill share
- Meter reading history
- Monthly electricity summary

7. Meter Management
Support:
- Assign meter to room
- Record meter readings
- View meter reading history
- Correct wrong readings
- Handle meter reset / replacement

If current_reading < previous_reading:
- do not calculate automatically
- mark as meter reset / invalid reading
- require admin review

================================
DATA MODELS
================================

Create these models/entities.

Hostel
- id
- name
- electricity_type enum(NO_ELECTRICITY, PREPAID, METER_BASED)
- electricity_rate_per_unit decimal
- billing_cycle enum(MONTHLY, CUSTOM)

Room
- id
- hostel_id
- room_number
- capacity integer
- meter_id nullable

ElectricityMeter
- id
- room_id
- meter_number
- installation_date
- is_active boolean

MeterReading
- id
- meter_id
- reading_date
- previous_reading decimal
- current_reading decimal
- units_consumed decimal
- status enum(VALID, RESET_REVIEW, CORRECTED)
- created_by
- notes nullable

ElectricityBill
- id
- room_id
- billing_period_start
- billing_period_end
- units_consumed decimal
- unit_rate decimal
- total_amount decimal
- status enum(GENERATED, FINALIZED)

Tenant
- id
- name
- room_id
- checkin_date
- checkout_date nullable

TenantElectricityShare
- id
- bill_id
- tenant_id
- stay_days integer
- amount decimal

================================
FUNCTIONAL REQUIREMENTS
================================

Implement the following features:

1. Hostel Settings
- Configure electricity_type
- Configure electricity_rate_per_unit
- Configure billing_cycle

2. Room + Meter Setup
- Assign meter to room
- Update/replace meter
- View room-meter mapping

3. Meter Reading Entry
- Admin can add meter reading for a room/meter
- Automatically populate previous reading from last valid reading
- Calculate units_consumed for valid readings
- Reject or flag negative consumption

4. Bill Generation
- Generate room electricity bill for a selected billing period
- Only for hostels with electricity_type = METER_BASED
- Use hostel electricity_rate_per_unit
- Find active tenants for the room during that billing period
- Split bill among tenants

5. Tenant Stay Calculation
For each tenant in billing period:
- compute overlap between tenant stay and billing period
- stay_days should be inclusive and based only on actual occupied days

6. Split Modes
Add a configurable split mode at implementation level or constants:
- EQUAL
- STAY_DURATION

Default to STAY_DURATION if there are partial stay dates, otherwise EQUAL is acceptable.

7. Reporting Endpoints / Screens
- room consumption report
- tenant share report
- meter reading history
- monthly summary

================================
EDGE CASES
================================

Handle:
- no active tenants in billing period -> bill can be generated for room, but no tenant shares
- one tenant only -> full bill assigned to that tenant
- tenants joining mid-month
- tenants leaving mid-month
- multiple tenant changes in same room in same billing cycle
- current_reading < previous_reading -> flag for admin review
- missing previous reading -> first reading should be treated as baseline, not billed unless explicitly configured
- prepaid or no electricity hostel -> no bill generation allowed

================================
API REQUIREMENTS
================================

Create simple REST APIs (or equivalent service methods) for:

Hostel settings
- create/update hostel electricity settings
- get hostel electricity settings

Meters
- assign meter to room
- replace meter
- list room meters

Meter readings
- create meter reading
- list meter readings by room/meter
- correct a reading

Bills
- generate bill for one room and period
- generate bills for all rooms for one hostel and period
- get bill details including tenant shares
- finalize bill

Reports
- room electricity report
- tenant electricity report
- meter history report
- monthly summary report

================================
UI REQUIREMENTS
================================

Keep UI very simple.

1. Hostel Settings Screen
Fields:
- Electricity Type: No Electricity / Prepaid / Meter Based
- Rate Per Unit
- Billing Cycle

Behavior:
- If NO_ELECTRICITY: hide billing features
- If PREPAID: only display "Electricity Type: Prepaid"
- If METER_BASED: show meter and billing features

2. Meter Reading Screen
Fields:
- Room
- Meter
- Previous Reading
- Current Reading
- Reading Date
- Units Consumed
- Status

3. Bill Details Screen
Show:
- Room
- Billing period
- Units consumed
- Unit rate
- Total room bill
- Tenant-wise split

4. Reports Screen
Basic tables for:
- room consumption
- tenant share
- meter history
- monthly summary

================================
IMPLEMENTATION EXPECTATIONS
================================

Please generate:
1. Database schema / ORM models
2. Service layer for business logic
3. REST API routes/controllers
4. Validation rules
5. Bill calculation logic
6. Tenant share calculation logic
7. Basic seed data or examples
8. Unit tests for core calculations

Important:
- Keep calculations deterministic
- Use decimal-safe money math
- Make code modular
- Add clear comments
- Keep naming clean and explicit

================================
ACCEPTANCE CRITERIA
================================

Feature is complete when:
- hostel electricity type can be configured
- prepaid only shows billing type and does nothing else
- meter-based hostels can store meter readings
- room bill is generated from readings
- tenant bill shares are generated correctly
- partial occupancy is handled correctly
- reports can be retrieved
- invalid meter resets are flagged for admin review

If any framework choice is needed, use a simple and common stack and generate the full working module.

======================

ask if you have any clarifications