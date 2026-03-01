# Hostel Management Requirements v0.2 (Issue #1 Comment-Aligned Draft)

Date: 2026-02-28  
Status: Draft (Pending team approval)  
Based on:
- `hostel-management-requirements.md` (v0.1 draft)
- Issue #1 body: https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/1
- Comment 1: https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/1#issuecomment-3971707535
- Comment 2 (architecture/scope/slack): https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/1#issuecomment-3971928667
- Comment 3 (design system): https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/1#issuecomment-3971950768

## 1) Alignment Summary

### Matches
- Issue purpose matches: track requirements foundation doc and review TODOs/confirm scope.
- Core functional scope FR-005 to FR-048 is aligned with issue comment direction.
- Room discovery/allocation emphasis (FR-017 to FR-028) aligns with comment priorities.
- Phase 1 keeps payment gateway out of implementation scope.

### Conflicts
- Audit logs:
  - Comment says Phase 1 scope is full requirements minus FR-049 and FR-050.
  - v0.1 doc currently includes audit logs in Phase 1 scope.
- Authentication:
  - Comment fixes auth to Google OAuth via NextAuth.
  - v0.1 FR-001 to FR-004 are password-based login/reset/policy/lockout requirements.

### New Scope From Comments (Not in v0.1 requirements)
- Slack bot as a second UI layer using the same Next.js API routes:
  - `/check-vacancy`
  - `/allocate`
  - `/occupancy`
  - `/complaints`
- Delivery sequencing (Sprint 1..4) and task decomposition.
- Design system direction: glassmorphism / liquid-glass UI.

## 2) Proposed Reconciled Scope for v0.2

### Functional Scope
- In scope: FR-005 to FR-048 (unchanged intent).
- Out of Phase 1 hackathon scope: FR-049, FR-050 (audit log).
- Replace password-first auth requirements with OAuth-first auth:
  - FR-001 (Revised): Admin must authenticate using Google OAuth.
  - FR-002 (Revised): System must use NextAuth session handling for protected dashboard routes.
  - FR-003 (Moved to Future Scope): Password complexity policy (only if local auth is introduced later).
  - FR-004 (Moved to Future Scope): Account lockout on failed password attempts (only if local auth is introduced later).

### Added Functional Requirements (Slack Layer)
- FR-051: System must support `/check-vacancy [block] [floor]` via Slack.
- FR-052: System must support `/allocate [resident-name] [room] [bed]` via Slack.
- FR-053: System must support `/occupancy` via Slack.
- FR-054: System must support `/complaints` via Slack.
- FR-055: Slack commands must call the same application APIs used by the web UI (no separate backend logic).

### Added Non-Functional Requirements (Responsive UI)
- NFR-006: Admin web UI must be fully usable on mobile screens down to 360px width.
- NFR-007: Primary Phase 1 pages (`/dashboard`, `/dashboard/hostel`, `/dashboard/rooms`) must avoid horizontal scrolling at 360px width for default workflows.
- NFR-008: Interactive controls on mobile must remain accessible without hover and must use touch-friendly targets (minimum 44x44 px for primary action controls where feasible).
- NFR-009: Responsive behavior must be verified at minimum viewport widths: 360px, 390px, 768px, and 1024px.
- NFR-010: Frontend UI must be implemented through a reusable component layer based on shadcn/ui primitives.
- NFR-011: The visual system must use an Apple-like liquid glass style (translucent layered surfaces, blur, soft borders, subtle gradients, and restrained motion), adapted for accessibility and content clarity.

#### Responsive Acceptance Criteria
- Layouts reflow from multi-column to single-column where needed.
- Forms and filters remain operable on touch devices.
- Key flows (hostel config, room search, allocation, dashboard summaries) are completable on mobile widths.

## 3) Architecture Decisions (Captured From Issue Comments)

These are implementation constraints agreed in issue discussion:
- Next.js 14 (App Router) monolith for frontend + backend routes.
- Prisma ORM with Neon Postgres.
- NextAuth.js for admin authentication.
- TanStack Query for client data fetching/state synchronization.
- Tailwind CSS + Framer Motion for UI styling and animation.
- shadcn/ui as the reusable component foundation on top of Tailwind CSS.
- TypeScript across codebase.

## 4) UI Design Direction (Captured From Issue Comments)

Design intent to keep consistent across feature work:
- Theme: Apple-like liquid glass.
- Dark gradient background (slate-900 to slate-950 or mesh gradient).
- Reusable UI kit in `components/ui/` built from shadcn/ui primitives and project style variants.
- Animation policy: subtle, meaningful motion (mount fade-up, hover emphasis).

Note: This is a design-system directive, not a business requirement. Keep it in engineering docs/AGENTS.md and reference during implementation.

## 5) TODO Resolution Snapshot

### Resolved by comments
- Payment gateway in Phase 1: not required.
- Stack and architecture choice: finalized for hackathon implementation.

### Still open
- Pricing model.
- SaaS vs self-hosted product direction.
- Multi-branch / multi-hostel long-term model.
- Data retention/privacy policy details.
- Backup frequency/method details.

## 6) Full Issue Backlog Cross-Check (Issues #2 to #12)

### Overall
- Total issues reviewed: 12 (all open as of 2026-02-28).
- Structure: Issue #1 is scope/requirements discussion; Issues #2 to #12 are implementation tasks.
- Broad alignment: task issues mostly map cleanly to FR-005 through FR-048 plus added Slack scope.

### Issue-by-Issue Mapping
- Issue #2 (Task 0 Project Setup): Infrastructure task. Supports implementation but does not directly map to specific FR IDs.
- Issue #3 (Task 0.5 UI Library): Design-system task. Supports consistency; not a business FR in v0.1.
- Issue #4 (Task 1 Prisma Schema): Mostly aligned. Includes `Allocation` model, which should be explicitly reflected in the requirements data model section.
- Issue #5 (Task 2 Auth): Conflicts with v0.1 password-based FR-001 to FR-004; aligned with this v0.2 OAuth-first proposal.
- Issue #6 (Task 3 Hostel Config): Aligned with FR-005 to FR-010 and FR-023 to FR-025.
- Issue #7 (Task 4 Room + Resident): Mostly aligned with FR-011 to FR-028.
- Issue #8 (Task 5 Dashboard): Aligned with FR-043 to FR-046.
- Issue #9 (Task 6 Fee Management): Aligned with FR-029 to FR-035.
- Issue #10 (Task 7 Complaints): Aligned with FR-036 to FR-039.
- Issue #11 (Task 8 Slack Bot): New scope vs v0.1; aligned with added FR-051 to FR-055 in this v0.2 draft.
- Issue #12 (Task 9 Notices + Reporting): Aligned with FR-040 to FR-042 and FR-047 to FR-048.

### Gaps / Corrections Found During Cross-Check
- Task 4 (Issue #7) filter list is narrower than FR-018:
  - Present in issue: sharing type, floor, block, AC/Non-AC, smoking, gender restriction, price range, availability.
  - Missing vs FR-018: bathroom, balcony, drinking.
- Task 5 (Issue #8) says FR-002 password reset is handled by Google. This requires explicit approval because it changes requirement semantics from local password reset to delegated OAuth account recovery.
- If audit logs are out of hackathon scope, references to FR-049 and FR-050 should remain documented but tagged "Deferred/Out of Phase 1 delivery."

### Source Issue Links
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/2
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/3
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/4
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/5
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/6
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/7
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/8
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/9
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/10
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/11
- https://github.com/rudrakshchandel/SDD-Hackathon-Hostel-Management/issues/12

## 7) Implementation Alignment Snapshot (As of 2026-02-28)

### Method
- This status is based on current code present in this repository branch (API routes, dashboard pages, Prisma schema, and UI files).
- Status labels:
  - `Implemented`: End-to-end code exists for major acceptance criteria.
  - `Partial`: Some criteria are implemented, but important items are missing.
  - `Not Implemented`: No substantial implementation found yet.

### Issue Task Status

| Issue | Task | Status | Notes |
| --- | --- | --- | --- |
| #2 | Task 0: Project setup | Implemented | Next.js 14 + TS + Tailwind + Prisma + deps present; `.env.example` exists. |
| #3 | Task 0.5: UI glass component library | Not Implemented | `components/ui/` only has `.gitkeep`; no Card/Button/Input/etc. |
| #4 | Task 1: Prisma schema | Implemented | Models + enums + relations are present, including `Allocation`. |
| #5 | Task 2: Auth (NextAuth + Google + protected routes) | Not Implemented | No `/api/auth` route, no login page, no `middleware.ts`. |
| #6 | Task 3: Hostel config CRUD | Implemented | Hostel/Block/Floor/Room/Bed CRUD APIs + dashboard UI + active-resident delete guards. |
| #7 | Task 4: Room discovery + resident management | Partial | Search/filter + room detail + allocate implemented; transfer/vacate flows missing; FR-018 filters not fully complete. |
| #8 | Task 5: Dashboard | Implemented | Occupancy/revenue/dues/complaints aggregates and dashboard cards implemented. |
| #9 | Task 6: Fee management | Not Implemented | Schema exists, but no fees/invoices/payments API or UI found. |
| #10 | Task 7: Complaint tracking | Not Implemented | Schema exists, but no complaint lifecycle API/UI found. |
| #11 | Task 8: Slack bot | Not Implemented | No `/api/slack` or Slack integration code found. |
| #12 | Task 9: Notices + reporting | Not Implemented | Schema exists, but no notices/reporting API/UI/CSV export found. |

### Requirement Coverage Snapshot

| Requirement Range | Area | Status | Notes |
| --- | --- | --- | --- |
| FR-001 to FR-004 | Authentication | Not Implemented (v0.1 semantics) | No auth flows currently implemented in code. |
| FR-005 to FR-010 | Hostel configuration | Implemented | CRUD + deletion constraints with active resident checks are present. |
| FR-011 to FR-016 | Resident management | Partial | Add resident + allocate supported; transfer/vacate lifecycle not yet present. |
| FR-017 to FR-022 | Room discovery/allocation | Partial | Core discovery + occupancy + room detail + bed allocation implemented. |
| FR-023 to FR-025 | Room attributes | Implemented | Attributes stored as JSON and configurable in CRUD UI/API. |
| FR-026 to FR-028 | Allocation constraints | Partial | Bed availability + gender checks implemented; policy-attribute validation is not fully implemented. |
| FR-029 to FR-035 | Fee management | Not Implemented | No module APIs/pages yet. |
| FR-036 to FR-039 | Complaints | Not Implemented | Dashboard reads complaint counts only; lifecycle module missing. |
| FR-040 to FR-042 | Notices | Not Implemented | No notices API/pages yet. |
| FR-043 to FR-046 | Dashboard | Implemented | All four summary metrics are coded. |
| FR-047 to FR-048 | Reporting CSV | Not Implemented | No CSV export routes/buttons found. |
| FR-049 to FR-050 | Audit logs | Not Implemented / Deferred | No audit log module found; aligned with deferred scope proposal. |
| FR-051 to FR-055 | Slack commands (v0.2 added) | Not Implemented | No Slack command handling code found. |
| NFR-006 to NFR-009 | Mobile responsiveness | Partial | Breakpoint-based responsive classes exist on core pages, but no explicit mobile UX pass or verification matrix is implemented/documented yet. |
| NFR-010 to NFR-011 | UI component system + liquid glass design | Not Implemented | `components/ui/` does not yet contain a built shadcn-based component library or finalized Apple-like liquid glass theme layer. |

### Specific Gaps to Close Next
- Task #7 filter parity with FR-018: add bathroom, balcony, drinking filters (in API and UI).
- Resident lifecycle completion: add explicit transfer and vacate endpoints/flows (FR-014, FR-015).
- Auth module: implement NextAuth + login + route protection (Issue #5).
- Run a dedicated mobile responsiveness pass for core dashboard pages and validate against NFR-006 to NFR-009 breakpoints.
- Implement shadcn/ui component library and apply Apple-like liquid glass styling tokens/variants across dashboard screens.
- Build remaining modules in task order: fees, complaints, slack, notices/reporting.

## 8) Change Log Entry (Proposed)

| Date | Version | Author | Summary |
| --- | --- | --- | --- |
| 2026-02-28 | v0.2-draft | Codex | Aligned requirements with issue #1 comments: removed audit logs from Phase 1 scope, switched auth to OAuth-first, added Slack command requirements, and documented architecture/design decisions. |
| 2026-02-28 | v0.2-draft.1 | Codex | Added explicit mobile-responsive non-functional requirements (NFR-006 to NFR-009), acceptance criteria, and current implementation status. |
| 2026-02-28 | v0.2-draft.2 | Codex | Added explicit shadcn/ui component-system requirement and Apple-like liquid glass design requirement (NFR-010, NFR-011), and updated implementation status mapping. |
