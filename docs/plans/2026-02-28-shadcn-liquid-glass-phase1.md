# Shadcn + Liquid Glass + Phase 1 Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a reusable shadcn-based Apple-like liquid glass UI foundation, complete responsive requirements, and finish remaining Phase 1 modules aligned to issues #2-#12 and v0.2 requirements.

**Architecture:** Keep the existing Next.js App Router monolith. Add a reusable `components/ui` layer from shadcn primitives and central liquid-glass tokens in global styles. Complete missing modules with API route handlers + dashboard pages, then converge all client data flows onto TanStack Query for cache consistency and mutation updates.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Prisma, NextAuth, Framer Motion, Neon Postgres.

---

## Skill-Orchestrated Workflow

1. `superpowers:using-git-worktrees` before any implementation.
2. `superpowers:executing-plans` to run this plan in batches.
3. `superpowers:test-driven-development` for every feature/bugfix step.
4. `superpowers:systematic-debugging` when tests fail unexpectedly.
5. `superpowers:verification-before-completion` before any completion claim.
6. `superpowers:requesting-code-review` after each major module batch.
7. `superpowers:finishing-a-development-branch` after all tasks are verified.

### Optional React/Next Skill Add-ons (Install Before Task 3)

Use `find-skills` output to install targeted domain guidance:

- React best practices:
  - `npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y`
- Next.js App Router patterns:
  - `npx skills add wshobson/agents@nextjs-app-router-patterns -g -y`
- Next.js best practices:
  - `npx skills add sickn33/antigravity-awesome-skills@nextjs-best-practices -g -y`

Note: These are optional but recommended for this repo because the stack is React + Next.js App Router.

---

### Task 1: Create Isolated Worktree + Baseline Verification

**Files:**
- Modify: none
- Verify: existing project root

**Step 1: Create implementation worktree**

Run: `git worktree add ../SDD-Hackathon-Hostel-Management-ui-plan -b feat/shadcn-liquid-glass-phase1`

**Step 2: Install deps and verify baseline**

Run: `npm install`

**Step 3: Verify current baseline commands**

Run:
- `npm run lint`
- `npm run build`

Expected: baseline status captured (pass or fail) before edits.

**Step 4: Commit checkpoint (optional)**

Run:
```bash
git add -A
git commit -m "chore: capture baseline in feature worktree"
```

---

### Task 2: Testing Foundation (TDD Enabler)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `tests/setup/render.tsx`
- Create: `tests/lib/rooms.search.test.ts`

**Step 1: Write first failing test**

```ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});
```

**Step 2: Run test to verify fail (tooling missing)**

Run: `npm test`
Expected: FAIL due to missing test script/config.

**Step 3: Add minimal test tooling**

- Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`
- Add deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@testing-library/user-event`
- Add `vitest.config.ts` and setup file.

**Step 4: Run tests and verify pass**

Run: `npm test`
Expected: PASS for harness test.

**Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts tests/
git commit -m "test: add vitest and testing-library foundation"
```

---

### Task 3: Initialize shadcn/ui + Base UI Primitives

**Files:**
- Create: `components.json`
- Create/Modify: `components/ui/*`
- Create: `lib/utils.ts`
- Modify: `app/globals.css`

**Step 1: Write failing component test**

Create test: `tests/ui/button.test.tsx`
```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";

it("renders button", () => {
  render(<Button>Save</Button>);
  expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
});
```

**Step 2: Run targeted test (should fail)**

Run: `npm test -- tests/ui/button.test.tsx`
Expected: FAIL because `Button` component does not exist.

**Step 3: Add shadcn primitives**

Generate/install and commit these minimum components:
- `button`, `card`, `input`, `select`, `badge`, `dialog`, `sheet`, `textarea`, `table`, `dropdown-menu`, `separator`

**Step 4: Re-run tests**

Run: `npm test -- tests/ui/button.test.tsx`
Expected: PASS.

**Step 5: Commit**

```bash
git add components.json components/ui lib/utils.ts app/globals.css tests/ui/button.test.tsx
git commit -m "feat(ui): initialize shadcn primitives"
```

---

### Task 4: Apple-like Liquid Glass Theme Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Create: `components/ui/glass-surface.tsx`

**Step 1: Write failing style contract test**

Create test: `tests/ui/glass-surface.test.tsx`
```tsx
import { render } from "@testing-library/react";
import { GlassSurface } from "@/components/ui/glass-surface";

it("applies liquid glass classes", () => {
  const { container } = render(<GlassSurface>Content</GlassSurface>);
  expect(container.firstChild).toHaveClass("backdrop-blur-xl");
});
```

**Step 2: Run targeted test (fail)**

Run: `npm test -- tests/ui/glass-surface.test.tsx`
Expected: FAIL because component does not exist.

**Step 3: Implement tokens + wrapper**

Implement:
- CSS variables for background gradients, glass opacity, border glow.
- `GlassSurface` component with standard class stack:
  - `backdrop-blur-xl`
  - translucent background
  - soft border
  - soft shadow glow

**Step 4: Verify test passes**

Run: `npm test -- tests/ui/glass-surface.test.tsx`

**Step 5: Commit**

```bash
git add app/globals.css tailwind.config.ts components/ui/glass-surface.tsx tests/ui/glass-surface.test.tsx
git commit -m "feat(ui): add liquid glass theme tokens and glass surface wrapper"
```

---

### Task 5: Responsive App Shell + Navigation

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/ui/app-sidebar.tsx`
- Create: `components/ui/mobile-nav-sheet.tsx`
- Modify: `app/(dashboard)/page.tsx`
- Modify: `app/(dashboard)/rooms/page.tsx`
- Modify: `app/(dashboard)/hostel/page.tsx`

**Step 1: Write failing responsive nav test**

Create test: `tests/layout/dashboard-layout.test.tsx`
```tsx
it("renders mobile menu trigger", () => {
  // render dashboard layout and assert a menu button exists
});
```

**Step 2: Run test to fail**

Run: `npm test -- tests/layout/dashboard-layout.test.tsx`
Expected: FAIL until layout shell exists.

**Step 3: Implement shell**

Implement fixed/desktop sidebar and mobile sheet navigation with shadcn `Sheet`.

**Step 4: Verify**

Run:
- `npm test -- tests/layout/dashboard-layout.test.tsx`
- `npm run build`

**Step 5: Commit**

```bash
git add app/(dashboard)/layout.tsx components/ui/app-sidebar.tsx components/ui/mobile-nav-sheet.tsx app/(dashboard)/page.tsx app/(dashboard)/rooms/page.tsx app/(dashboard)/hostel/page.tsx tests/layout/dashboard-layout.test.tsx
git commit -m "feat(ui): add responsive dashboard shell with mobile navigation"
```

---

### Task 6: TanStack Query Integration for Existing Dashboard/Hostel/Rooms

**Files:**
- Create: `lib/query-client.ts`
- Modify: `app/layout.tsx`
- Modify: `app/(dashboard)/hostel/hostel-config-client.tsx`
- Modify: `app/(dashboard)/rooms/rooms-dashboard-client.tsx`
- (Optional) Create: `hooks/*`

**Step 1: Write failing query hook test**

Create test: `tests/rooms/use-rooms-query.test.tsx`
```tsx
it("fetches rooms via react-query hook", async () => {
  // expect hook returns room list
});
```

**Step 2: Run to fail**

Run: `npm test -- tests/rooms/use-rooms-query.test.tsx`

**Step 3: Implement QueryClient provider + hooks**

- Add `QueryClientProvider` at root.
- Replace manual `useEffect` fetch calls with query/mutation hooks.

**Step 4: Verify**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add lib/query-client.ts app/layout.tsx app/(dashboard)/hostel/hostel-config-client.tsx app/(dashboard)/rooms/rooms-dashboard-client.tsx hooks tests/rooms/use-rooms-query.test.tsx
git commit -m "refactor(data): adopt tanstack query for dashboard modules"
```

---

### Task 7: Auth Module (Issue #5)

**Files:**
- Create: `auth.ts` (or `lib/auth.ts`)
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/(auth)/login/page.tsx`
- Create: `middleware.ts`
- Modify: `.env.example`
- Modify: `prisma/schema.prisma` (if adapter models are needed)

**Step 1: Write failing auth route protection test**

Create: `tests/auth/middleware.test.ts`
```ts
it("redirects unauthenticated dashboard access to /login", () => {
  // assert redirect behavior
});
```

**Step 2: Run fail**

Run: `npm test -- tests/auth/middleware.test.ts`

**Step 3: Implement NextAuth Google + middleware**

- Configure provider and session handling.
- Protect `/dashboard/*`.
- Add env placeholders: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_URL`.

**Step 4: Verify**

Run:
- `npm test -- tests/auth/middleware.test.ts`
- `npm run build`

**Step 5: Commit**

```bash
git add auth.ts lib/auth.ts app/api/auth/[...nextauth]/route.ts app/(auth)/login/page.tsx middleware.ts .env.example prisma/schema.prisma tests/auth/middleware.test.ts
git commit -m "feat(auth): add nextauth google login and protected dashboard routes"
```

---

### Task 8: Complete Room Discovery + Resident Lifecycle Gaps (Issue #7)

**Files:**
- Modify: `lib/rooms.ts`
- Modify: `app/api/rooms/route.ts`
- Modify: `app/(dashboard)/rooms/rooms-dashboard-client.tsx`
- Create: `app/api/residents/transfer/route.ts`
- Create: `app/api/residents/vacate/route.ts`

**Step 1: Write failing filter parity test**

Create: `tests/rooms/filters.test.ts`
```ts
it("supports bathroom, balcony, drinking filters", async () => {
  // expect filter params are honored
});
```

**Step 2: Run fail**

Run: `npm test -- tests/rooms/filters.test.ts`

**Step 3: Implement missing filters + flows**

- Add `bathroom`, `balcony`, `drinking` filters.
- Add transfer endpoint that closes old allocation and opens new one.
- Add vacate endpoint that ends allocation and frees bed.

**Step 4: Verify**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add lib/rooms.ts app/api/rooms/route.ts app/(dashboard)/rooms/rooms-dashboard-client.tsx app/api/residents/transfer/route.ts app/api/residents/vacate/route.ts tests/rooms/filters.test.ts
git commit -m "feat(rooms): complete filter parity and resident transfer/vacate flows"
```

---

### Task 9: Fee + Complaint Modules (Issues #9 and #10)

**Files:**
- Create: `app/api/fees/route.ts`
- Create: `app/api/fees/[feeId]/route.ts`
- Create: `app/(dashboard)/fees/page.tsx`
- Create: `app/api/complaints/route.ts`
- Create: `app/api/complaints/[complaintId]/route.ts`
- Create: `app/(dashboard)/complaints/page.tsx`

**Step 1: Write failing API tests**

Create:
- `tests/api/fees.route.test.ts`
- `tests/api/complaints.route.test.ts`

**Step 2: Run fail**

Run:
- `npm test -- tests/api/fees.route.test.ts`
- `npm test -- tests/api/complaints.route.test.ts`

**Step 3: Implement minimal pass**

- Fee structure CRUD, invoice creation trigger, payment record mutation.
- Complaint create/update/close with resolution notes and timestamps.

**Step 4: Verify**

Run:
- `npm test`
- `npm run build`

**Step 5: Commit**

```bash
git add app/api/fees app/(dashboard)/fees app/api/complaints app/(dashboard)/complaints tests/api/fees.route.test.ts tests/api/complaints.route.test.ts
git commit -m "feat(core): add fee management and complaint lifecycle modules"
```

---

### Task 10: Notices + CSV Reporting + Slack Layer (Issues #11 and #12)

**Files:**
- Create: `app/api/notices/route.ts`
- Create: `app/api/notices/[noticeId]/route.ts`
- Create: `app/(dashboard)/notices/page.tsx`
- Create: `app/api/reports/residents/route.ts`
- Create: `app/api/reports/fees/route.ts`
- Create: `app/api/slack/route.ts`
- Modify: `.env.example`

**Step 1: Write failing tests**

Create:
- `tests/api/notices.route.test.ts`
- `tests/api/reports-csv.test.ts`
- `tests/api/slack.route.test.ts`

**Step 2: Run fail**

Run:
- `npm test -- tests/api/notices.route.test.ts`
- `npm test -- tests/api/reports-csv.test.ts`
- `npm test -- tests/api/slack.route.test.ts`

**Step 3: Implement minimal pass**

- Notices CRUD/archive.
- Resident and fee CSV exports.
- Slack command endpoint with `/check-vacancy`, `/allocate`, `/occupancy`, `/complaints` mapped to existing service logic.
- Add env keys: `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`.

**Step 4: Verify**

Run:
- `npm test`
- `npm run lint`
- `npm run build`

**Step 5: Commit**

```bash
git add app/api/notices app/(dashboard)/notices app/api/reports app/api/slack .env.example tests/api/notices.route.test.ts tests/api/reports-csv.test.ts tests/api/slack.route.test.ts
git commit -m "feat(final): add notices reporting and slack command layer"
```

---

### Task 11: Final Requirement Alignment + Verification Report

**Files:**
- Modify: `hostel-management-requirements-v0.2-issue1-alignment.md`
- Modify: `README.md`

**Step 1: Reconcile implementation matrix**

Update statuses for issues and FR/NFR coverage after all modules land.

**Step 2: Run full verification (mandatory)**

Run:
- `npm test`
- `npm run lint`
- `npm run build`

Expected: all pass; include command outputs in PR/body notes.

**Step 3: Final commit**

```bash
git add hostel-management-requirements-v0.2-issue1-alignment.md README.md
git commit -m "docs: finalize implementation alignment and verification summary"
```

---

## Batch Execution Order (for `executing-plans`)

- Batch A: Tasks 1-3
- Batch B: Tasks 4-6
- Batch C: Tasks 7-8
- Batch D: Tasks 9-10
- Batch E: Task 11 + branch finishing skill

---

Plan complete and saved to `docs/plans/2026-02-28-shadcn-liquid-glass-phase1.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
