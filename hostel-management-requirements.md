# Hostel Management Requirements Foundation (Phase 1: Admin Only)

## 1) Overview
### Problem Statement
- Hostel operators lack a centralized, reliable system to configure hostel inventory, manage residents, track fees, and handle complaints using a single source of truth.

### Objectives
- Provide an admin-only system to configure hostel assets, manage residents, and track operational activity.
- Ensure data is auditable, consistent, and exportable for operational decision-making.
- Establish a versioned requirements foundation for multi-session collaboration.

### Assumptions
- Phase 1 supports a single Admin/Owner role only.
- System is web-based and accessed by the Admin/Owner.
- Payment gateway integration is not required in Phase 1 (TODO: confirm future needs).

### Phase 1 Scope (Admin Only)
- Admin authentication, hostel configuration, resident management, fee management, complaints, notices, dashboard, reporting, and audit logs.
- No other roles are supported in Phase 1.

### Future Scope
- All non-admin roles (Warden, Accountant, Staff, Resident, etc.) are FUTURE SCOPE.
- Mobile apps, resident self-service, and AI recommendations are FUTURE SCOPE.

## 2) Stakeholders
- Admin/Owner (Primary and only supported role in Phase 1)
- FUTURE SCOPE: Warden, Accountant, Staff, Resident, Security, Visitors

## 3) Admin Role Definition
### Responsibilities
- Configure hostel structure (blocks, floors, rooms, beds).
- Manage resident lifecycle and allocations.
- Define fees, record payments, track dues and refunds.
- Handle complaints and publish notices.
- Monitor operational summaries and exports.

### Permissions
- Full CRUD permissions for all Phase 1 entities.
- View and export all reports.
- Access audit logs for all critical actions.

### Access Boundaries
- Admin must not access features reserved for FUTURE SCOPE roles.
- Admin must operate within a single-hostel context in Phase 1 (TODO: confirm).

## 4) Functional Requirements (Admin Only)

### A. Authentication
- FR-001: The system must allow the Admin to log in using a username/email and password.
- FR-002: The system must provide a password reset flow via email or OTP (TODO: confirm channel).
- FR-003: The system must enforce a minimum password length and complexity policy (TODO: define policy).
- FR-004: The system must lock the account after a configurable number of failed attempts (TODO: define threshold).

### B. Hostel Configuration
- FR-005: The system must allow the Admin to create a hostel profile with name, address, and contact details.
- FR-006: The system must allow the Admin to add, edit, and delete blocks/buildings.
- FR-007: The system must allow the Admin to add, edit, and delete floors within a block.
- FR-008: The system must allow the Admin to add, edit, and delete rooms within a floor.
- FR-009: The system must allow the Admin to add, edit, and delete beds within a room.
- FR-010: The system must prevent deletion of any block, floor, room, or bed that has active residents.

### C. Resident Management (Admin Only)
- FR-011: The system must allow the Admin to add a resident with personal details (name, DOB, gender, contact, ID).
- FR-012: The system must store resident documents as metadata with file placeholders (no storage integration required in Phase 1).
- FR-013: The system must allow the Admin to allocate a resident to a specific bed in a room.
- FR-014: The system must allow the Admin to transfer a resident to another bed, preserving history.
- FR-015: The system must allow the Admin to vacate a resident and free the bed.
- FR-016: The system must maintain resident status as Active, Pending, or Vacated.

#### Room Discovery & Smart Allocation (Admin-driven in Phase 1)
- FR-017: The system must allow the Admin to search and filter available rooms/beds by configurable attributes.
- FR-018: Filters must include sharing type, floor, block/building, AC/Non-AC, bathroom, balcony, smoking, drinking, gender restriction, price range, and availability status.
- FR-019: The system must show real-time room availability with total beds, occupied beds, and vacant beds.
- FR-020: The system must allow the Admin to view room details prior to allocation.
- FR-021: The system must allow the Admin to view current occupants of a room.
- FR-022: The system must allow the Admin to allocate a specific bed within a room.

#### Room Attribute Configuration
- FR-023: The system must allow the Admin to define room attributes during room creation.
- FR-024: Room rules (e.g., smoking allowed) must be configurable fields, not hardcoded.
- FR-025: The system must support an extensible attribute model for future room attributes (TODO: define model).

#### Allocation Constraints
- FR-026: The system must prevent allocation when no beds are available.
- FR-027: The system must prevent allocation when gender rules mismatch, if gender rules are enabled.
- FR-028: The system must validate allocation against room policy attributes (e.g., smoking allowed).

#### Future Scope Note
- FUTURE SCOPE: Residents may self-select rooms via portal.
- FUTURE SCOPE: AI-based room recommendation.

### D. Fee Management
- FR-029: The system must allow the Admin to define fee structures by room type and period.
- FR-030: The system must generate invoices for residents based on defined fee structures.
- FR-031: The system must allow the Admin to record manual payments against invoices.
- FR-032: The system must track outstanding dues per resident.
- FR-033: The system must manage security deposits per resident.
- FR-034: The system must track refund status for security deposits.
- FR-035: The system must not require a payment gateway in Phase 1 (TODO: confirm future integration).

### E. Complaint Tracking (Admin Handled Only)
- FR-036: The system must allow the Admin to create a complaint record on behalf of a resident.
- FR-037: The system must allow the Admin to update complaint status (Open, In Progress, Closed).
- FR-038: The system must allow the Admin to close complaints with resolution notes.
- FR-039: The system must store complaint history with timestamps.

### F. Notices
- FR-040: The system must allow the Admin to create notices with title, body, and target audience (Admin-managed).
- FR-041: The system must allow the Admin to edit notices.
- FR-042: The system must allow the Admin to archive notices.

### G. Dashboard
- FR-043: The system must show occupancy summary (total beds, occupied, vacant).
- FR-044: The system must show revenue summary (invoiced, collected, dues).
- FR-045: The system must show pending dues count and amount.
- FR-046: The system must show active complaints count.

### H. Basic Reporting
- FR-047: The system must allow export of resident list to CSV (placeholder).
- FR-048: The system must allow export of fee report to CSV (placeholder).

### I. Audit Log
- FR-049: The system must log critical admin actions (create/update/delete, allocations, payments).
- FR-050: The system must store timestamp, actor, action type, and target entity in the audit log.

## 5) Non-Functional Requirements
- NFR-001: The system must enforce secure authentication and session management.
- NFR-002: The system must support automated data backups (TODO: define frequency and method).
- NFR-003: The system should respond to standard admin actions within 2 seconds under normal load.
- NFR-004: The system must provide auditability for all critical actions.
- NFR-005: The system must store personal data securely and comply with applicable privacy policies (TODO: define).

## 6) High-Level Data Model
### Key Entities and Fields (High-Level)
- AdminUser: id, name, email, passwordHash, status, lastLoginAt
- Hostel: id, name, address, contactNumber, timezone
- Block: id, hostelId, name, description
- Floor: id, blockId, floorNumber, label
- Room: id, floorId, roomNumber, sharingType, attributes, basePrice
- Bed: id, roomId, bedNumber, status
- Resident: id, fullName, dob, gender, contact, idProofType, idProofNumber, status
- Invoice: id, residentId, periodStart, periodEnd, totalAmount, status
- Payment: id, invoiceId, amount, method, receivedAt, reference
- Complaint: id, residentId, category, description, status, createdAt, closedAt
- Notice: id, title, body, status, createdAt, archivedAt
- AuditLog: id, actorId, actionType, entityType, entityId, createdAt, metadata

## 7) Key Workflows
- Add hostel structure: Create hostel -> add blocks -> add floors -> add rooms -> add beds.
- Onboard resident & allocate bed: Add resident -> search/filter room -> view room -> allocate bed.
- Generate invoice & record payment: Define fee -> generate invoice -> record manual payment.
- Vacate & refund deposit: Mark resident vacated -> release bed -> record refund status.
- Complaint lifecycle: Create complaint -> update status -> close with resolution.

## 8) Future Scope (Clearly Marked)
- Role-based access control (multi-role)
- Warden login
- Resident portal/mobile app
- Online payments
- Visitor management
- Inventory management
- Staff management
- Multi-hostel support
- SMS/WhatsApp notifications
- Advanced analytics

## 9) Open Questions / TODO
- TODO: Pricing model?
- TODO: SaaS vs self-hosted?
- TODO: Multi-branch future support?
- TODO: Payment gateway selection?
- TODO: Data retention policy?

## 10) Collaboration Rules
- Versioning format: v0.1, v0.2, v1.0, etc.
- Requirement status tagging: Proposed / Approved / Implemented.
- Adding new requirements:
  - Propose in a new FR-XXX entry.
  - Include rationale and acceptance criteria.
  - Update Change Log with summary.
- Change log template: Date | Version | Author | Summary.

## 11) Change Log
| Date | Version | Author | Summary |
| --- | --- | --- | --- |
| TODO | v0.1 | TODO | Initial requirements foundation |