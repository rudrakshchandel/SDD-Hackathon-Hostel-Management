# Phase 1 Revised Scope (Excluding Tasks 4, 5, 6) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the remaining Phase 1 product work while explicitly skipping prior Tasks 4, 5, and 6.

**Architecture:** Keep the current Next.js App Router structure and Prisma backend. Finish module gaps with API-first changes, then wire dashboard pages with stable client behavior and targeted tests. Do not perform the previously planned Task 4/5/6 work.

**Tech Stack:** Next.js 14, TypeScript, Prisma, Neon Postgres, NextAuth, Tailwind CSS, Framer Motion, Vitest.

---

## Scope Rules

1. Do not execute or reintroduce old Task 4 (theme token refactor), Task 5 (responsive shell rewrite), or Task 6 (TanStack integration pass).
2. Keep existing UI/architecture decisions unless required to complete Tasks 7-11.
3. Every feature task must ship with tests or explicit test notes where automation is not practical.

---

### Task 1: Baseline Verification + Working Branch Hygiene

**Files:**
- Modify: none
- Verify: repository root

**Step 1: Capture current branch status**

Run: `git status --short`
Expected: current changes are visible before new work.

**Step 2: Install dependencies (if needed)**

Run: `npm install`
Expected: install completes without dependency errors.

**Step 3: Run baseline checks**

Run:
- `npm run lint`
- `npm run test`
- `npm run build`

Expected: baseline failures/successes are documented before edits.

**Step 4: Commit checkpoint (optional)**

```bash
git add -A
git commit -m "chore: capture baseline before revised phase1 execution"
```

---

### Task 2: Test Coverage Foundation for Remaining Modules

**Files:**
- Modify: `package.json`
- Modify: `tests/dashboard-ai.test.ts`
- Create: `tests/api/rooms.route.test.ts`
- Create: `tests/api/residents.route.test.ts`
- Create: `tests/api/revenue.route.test.ts`

**Step 1: Write failing API test for rooms search behavior**

Run: `npm test -- tests/api/rooms.route.test.ts`
Expected: FAIL because the new test file/assertions do not exist yet.

**Step 2: Add minimal API-level tests for rooms/residents/revenue paths**

Implement tests for:
- success response shape
- validation failure path
- not-found or empty state behavior

**Step 3: Run targeted tests**

Run:
- `npm test -- tests/api/rooms.route.test.ts`
- `npm test -- tests/api/residents.route.test.ts`
- `npm test -- tests/api/revenue.route.test.ts`

Expected: PASS.

**Step 4: Run full suite**

Run: `npm test`
Expected: PASS with existing and new tests.

**Step 5: Commit**

```bash
git add package.json tests/
git commit -m "test: add api coverage for rooms residents and revenue flows"
```

---

### Task 3: UI Primitives Consistency Pass (Non-Task-4/5 Work)

**Files:**
- Modify: `app/(dashboard)/hostel/hostel-config-client.tsx`
- Modify: `app/(dashboard)/rooms/rooms-dashboard-client.tsx`
- Modify: `app/(dashboard)/tenants/page.tsx`
- Modify: `app/(dashboard)/revenue/page.tsx`
- Modify: `app/components/top-nav.tsx`

**Step 1: Write failing UI test for consistent control usage**

Create/modify a test asserting dashboard forms render consistent button/input/select styling.

Run: `npm test -- tests/ui/forms-consistency.test.ts`
Expected: FAIL before component updates.

**Step 2: Replace remaining raw controls with shared primitives**

Use existing reusable UI components to normalize:
- button appearance (save/add/delete variants)
- select/input styling
- spacing/alignment consistency

**Step 3: Verify interaction does not regress**

Run:
- `npm run lint`
- `npm test -- tests/ui/forms-consistency.test.ts`

Expected: PASS.

**Step 4: Manual smoke**

Run: `npm run dev`
Check `/dashboard`, `/rooms`, `/hostel`, `/tenants`, `/revenue`.

**Step 5: Commit**

```bash
git add app/(dashboard) app/components/top-nav.tsx tests/
git commit -m "feat(ui): normalize dashboard form controls and action buttons"
```

---

### Task 7: Auth Module Completion (Issue #5)

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/api/auth/[...nextauth]/route.ts`
- Modify: `lib/auth.ts`
- Modify: `app/(dashboard)/layout.tsx`

**Step 1: Write failing auth access test**

Create test for unauthenticated access redirect/deny behavior.

Run: `npm test -- tests/auth/access-control.test.ts`
Expected: FAIL initially.

**Step 2: Implement auth flow hardening**

Ensure:
- login route works reliably
- protected dashboard pages reject anonymous sessions
- local/dev auth mode remains test-friendly

**Step 3: Re-run auth tests**

Run: `npm test -- tests/auth/access-control.test.ts`
Expected: PASS.

**Step 4: Smoke auth journey**

Run app locally and verify:
- `/` navigation
- `/login` behavior
- protected route handling

**Step 5: Commit**

```bash
git add app/login/page.tsx app/api/auth/[...nextauth]/route.ts lib/auth.ts app/(dashboard)/layout.tsx tests/
git commit -m "feat(auth): finalize protected dashboard and login reliability"
```

---

### Task 8: Rooms + Resident Lifecycle Gaps (Issue #7)

**Files:**
- Modify: `app/(dashboard)/rooms/rooms-dashboard-client.tsx`
- Modify: `app/api/residents/allocate/route.ts`
- Modify: `app/api/residents/vacate/route.ts`
- Create: `app/api/residents/transfer/route.ts`
- Modify: `lib/rooms.ts`

**Step 1: Write failing lifecycle tests**

Add tests for allocate, vacate, transfer transitions and bed availability math.

Run: `npm test -- tests/api/residents.route.test.ts`
Expected: FAIL for missing transfer flow or edge assertions.

**Step 2: Implement transfer and lifecycle edge handling**

Implement:
- resident transfer between rooms
- vacancy updates in source/destination
- guardrails for invalid operations

**Step 3: Update UI actions and optimistic feedback**

Ensure room details section can:
- allocate
- vacate
- transfer
with clear success/error states.

**Step 4: Re-run tests + smoke**

Run:
- `npm test -- tests/api/residents.route.test.ts`
- `npm run lint`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/(dashboard)/rooms/rooms-dashboard-client.tsx app/api/residents lib/rooms.ts tests/
git commit -m "feat(rooms): complete resident allocate vacate and transfer lifecycle"
```

---

### Task 9: Fee + Complaint Module Completion (Issues #9, #10)

**Files:**
- Modify: `app/(dashboard)/revenue/page.tsx`
- Modify: `app/(dashboard)/tenants/page.tsx`
- Create: `app/api/fees/route.ts`
- Create: `app/api/fees/[feeId]/payments/route.ts`
- Create: `app/api/complaints/route.ts`
- Create: `app/api/complaints/[complaintId]/route.ts`
- Modify: `prisma/seed.js`

**Step 1: Write failing API tests for fee/complaint workflows**

Run:
- `npm test -- tests/api/fees.route.test.ts`
- `npm test -- tests/api/complaints.route.test.ts`

Expected: FAIL initially.

**Step 2: Implement fee and complaint endpoints**

Support:
- list/create/update status
- payment capture path
- due/paid computations by tenant and hierarchy filters

**Step 3: Update revenue + tenants UI**

Implement hierarchical visibility:
- hostel -> block -> floor -> room -> tenant
and paid/unpaid clarity with due dates.

**Step 4: Seed realistic data and verify**

Run:
- `npm run db:seed`
- `npm test -- tests/api/fees.route.test.ts`
- `npm test -- tests/api/complaints.route.test.ts`

Expected: PASS and visible data in UI.

**Step 5: Commit**

```bash
git add app/(dashboard)/revenue/page.tsx app/(dashboard)/tenants/page.tsx app/api/fees app/api/complaints prisma/seed.js tests/
git commit -m "feat(finance): add fee payment and complaint management workflows"
```

---

### Task 10: Notices + CSV + Slack Layer (Feature Flagged)

**Files:**
- Modify: `app/api/slack/command/route.ts`
- Modify: `app/api/slack/events/route.ts`
- Modify: `lib/feature-flags.ts`
- Modify: `lib/slack.ts`
- Modify: `lib/slack-assistant.ts`
- Modify: `.env.example`

**Step 1: Write failing flag behavior tests**

Add tests to ensure Slack handlers short-circuit when `SLACK_ENABLED=false`.

Run: `npm test -- tests/api/slack.route.test.ts`
Expected: FAIL initially.

**Step 2: Enforce strict feature-flag guards**

Ensure Slack routes:
- return safe disabled response when off
- validate signatures when on
- avoid runtime crashes from missing env vars

**Step 3: Implement/verify CSV export paths for notices/reporting**

Confirm exports are accessible without Slack dependency.

**Step 4: Re-run tests + lint**

Run:
- `npm test -- tests/api/slack.route.test.ts`
- `npm run lint`

Expected: PASS.

**Step 5: Commit**

```bash
git add app/api/slack lib/feature-flags.ts lib/slack.ts lib/slack-assistant.ts .env.example tests/
git commit -m "feat(integrations): finalize slack feature flag and reporting safety"
```

---

### Task 10.1: AI Assistant Markdown Rendering + True Streaming UX

**Files:**
- Modify: `app/dashboard/home-ai-assistant.tsx`
- Modify: `app/api/assistant/stream/route.ts`
- Modify: `app/api/assistant/query/route.ts`
- Modify: `package.json`
- Create: `tests/ui/home-ai-assistant-markdown.test.tsx`
- Create: `tests/api/assistant-stream.route.test.ts`

**Step 1: Write failing tests for markdown + stream behavior**

Add tests for:
- Markdown content rendering (headings/lists/code blocks)
- Incremental stream updates (delta events append progressively)

Run:
- `npm test -- tests/ui/home-ai-assistant-markdown.test.tsx`
- `npm test -- tests/api/assistant-stream.route.test.ts`

Expected: FAIL before implementation.

**Step 2: Add Markdown renderer dependencies**

Add and configure:
- `react-markdown`
- `remark-gfm`
- `rehype-sanitize`

**Step 3: Render AI answer as safe Markdown**

Update assistant UI to:
- Replace plain text output with Markdown renderer
- Preserve streaming cursor while content is still arriving
- Keep fallback empty/loading/error states intact

**Step 4: Make stream UX feel token-by-token**

Update stream handling so:
- deltas are appended smoothly as they arrive
- done/error events finalize state cleanly
- no full-response jump at the end

**Step 5: Verify end-to-end behavior**

Run:
- `npm run lint`
- `npm test -- tests/ui/home-ai-assistant-markdown.test.tsx`
- `npm test -- tests/api/assistant-stream.route.test.ts`
- `npm test`

Expected: PASS.

**Step 6: Commit**

```bash
git add app/dashboard/home-ai-assistant.tsx app/api/assistant/stream/route.ts app/api/assistant/query/route.ts package.json package-lock.json tests/
git commit -m "feat(ai): render markdown responses and improve streaming experience"
```

---

### Task 11: Final Requirements Alignment + Release Verification

**Files:**
- Modify: `hostel-management-requirements-v0.2-issue1-alignment.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-03-02-phase1-revised-without-4-5-6.md`

**Step 1: Update alignment statuses**

Reflect final completion against issues and FR coverage, explicitly noting Task 4/5/6 exclusion.

**Step 2: Run full verification**

Run:
- `npm run lint`
- `npm test`
- `npm run build`

Expected: PASS and ready for release.

**Step 3: Prepare changelog summary**

Document key completed modules and known follow-ups.

**Step 4: Commit**

```bash
git add hostel-management-requirements-v0.2-issue1-alignment.md README.md docs/plans/2026-03-02-phase1-revised-without-4-5-6.md
git commit -m "docs: finalize revised phase1 plan and requirement alignment"
```

---

## Execution Handoff

### Execution Status (2026-03-02)

- Task 1: Completed (baseline verified on feature branch)
- Task 2: Completed (API test foundation + `test:api` script + revenue API route)
- Task 3: Completed (shared button primitive introduced; rooms/top-nav control consistency pass; forms consistency tests added)
- Task 7: Completed (auth matcher coverage includes revenue; access-control tests added)
- Task 8: Completed (resident transfer API + UI transfer/vacate actions + lifecycle tests)
- Task 9: Completed (fees and complaints API modules + tests; existing revenue/tenant hierarchy views reused)
- Task 10: Completed (notices APIs + CSV reporting route + Slack flag tests)
- Task 10.1: Completed (assistant markdown rendering + safer display + chunked streaming + tests)
- Task 11: Completed (requirements/README alignment updates + lint/test/build verification)

Plan complete and saved to `docs/plans/2026-03-02-phase1-revised-without-4-5-6.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Parallel Session (separate)** - Open new session with `executing-plans`, batch execution with checkpoints.

Which approach?
