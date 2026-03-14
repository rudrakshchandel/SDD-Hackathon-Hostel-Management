# UI Style Guide

This document captures the styling rules already established in the app so future changes stay visually consistent.

## Purpose

- Treat this as the implementation-facing guide for UI work in this repo.
- Prefer matching existing patterns over introducing new visual systems.
- When unsure, reuse a shared class or primitive instead of inventing a one-off style.

## Current Styling Stack

- **Framework:** Tailwind CSS utility classes.
- **Global theme tokens:** `app/globals.css`.
- **Theme state:** `lib/theme-context.tsx`.
- **Initial theme bootstrapping:** `app/layout.tsx` injects a script before hydration.
- **Shared UI primitives:** `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/select.tsx`.
- **Shared composition examples:** dashboard, rooms, hostel, electricity, tenants, login.

## Core Design Language

The app uses a **liquid glass / frosted panel** style:

- translucent white surfaces in light mode
- deep slate translucent surfaces in dark mode
- soft borders with inner highlights
- large blur values for panels/cards
- restrained blue primary actions
- rounded corners across the UI
- subtle entrance motion for pages and sections

This means new UI should usually look like:

- a gradient app background
- glass panels for major containers
- glass cards for nested content
- rounded controls with soft shadows
- slate typography instead of hard black

## Theme Rules

### 1. Theme source of truth

- Theme mode is `light`, `dark`, or `system`.
- Store user preference in `localStorage` under `theme-preference`.
- Apply the resolved theme by toggling the `dark` class on `document.documentElement`.
- Also set `data-theme` on the root element.

### 2. How dark mode is implemented

- Do **not** build separate pages for dark mode.
- The system relies on:
  - CSS variables for app foreground/background
  - `.dark` overrides in `app/globals.css`
  - utility remapping for common text/background/border classes
- Because of those overrides, it is normal in this codebase to keep using classes like `text-slate-900`, `text-slate-700`, `bg-white/50`, and `border-white/60` in components.

### 3. Theme behavior to preserve

- Keep the pre-hydration theme init script in sync with `ThemeProvider` behavior.
- New theme-aware components should follow the current pattern: rely on shared classes and existing `.dark` overrides first.
- Only add new dark-mode overrides in `app/globals.css` when an existing token/class pattern does not cover the need.

## Shared Surface Tokens

These classes are the primary visual building blocks and should be reused before creating custom class stacks.

### `glass-panel`

Use for:

- page sections
- major forms
- large containers
- modal-like blocks
- navigation shells

Typical traits:

- `rounded-2xl`
- translucent background
- visible border
- heavier blur
- larger shadow

Examples:

- top navigation shell
- login card
- rooms filter section
- hostel configuration sections
- electricity page sections

### `glass-card`

Use for:

- nested cards inside a panel
- stat cards
- expandable list items
- lightweight action surfaces
- secondary interactive containers

Typical traits:

- `rounded-xl`
- slightly smaller shadow than `glass-panel`
- same frosted-glass family

### `glass-chip`

Use for:

- tiny metadata pills
- room attributes
- compact counters
- status-like supporting labels

Keep these short and compact.

## Button Rules

### Preferred API

- Use `Button` from `components/ui/button.tsx` when it fits.
- Supported variants are `primary`, `secondary`, `danger`, and `ghost`.

### Variant mapping

- `primary` -> `glass-btn-primary`
- `secondary` -> `glass-btn-secondary`
- `danger` -> `glass-btn-danger`
- `ghost` -> `glass-card`

### When direct class usage is acceptable

Direct `<button>` styling is already used in some screens for layout-specific sizing. If doing that:

- start from an existing glass button class
- add only layout/spacing classes needed for that location
- preserve rounded corners and minimum touch height

### Action styling rules

- Primary action: blue glass button.
- Secondary action: neutral glass button.
- Destructive action: rose/red glass button.
- Most tappable buttons/links use `min-h-11` or `h-11`.
- Avoid flat solid buttons that break the glass system.

## Form Rules

### Preferred primitives

- Use `Input` from `components/ui/input.tsx`.
- Use `Select` from `components/ui/select.tsx`.
- Reuse `Button` for form actions where practical.

This is already enforced by tests for key dashboard forms.

### Form styling conventions

- Labels are usually small, uppercase, and tracked.
- Inputs/selects are rounded and glassy, usually with `h-10` or `min-h-11`.
- Prefer slate text and placeholder colors.
- Keep focus rings in the sky/blue family.
- Group form fields with `space-y-1`, `space-y-3`, or grid gaps instead of custom margins.

### Form layout conventions

- Mobile-first first, then enhance with `sm:` and `md:` breakpoints.
- Use stacked layouts by default.
- Use grids for larger forms rather than bespoke absolute positioning.

## Layout Rules

### Page shell

Most authenticated pages follow this structure:

- `main` with `page-enter`
- centered container using `mx-auto`
- width cap like `max-w-5xl`, `max-w-6xl`, or `max-w-7xl`
- `space-y-6`
- `p-6`

### Section rhythm

- First section is usually a header.
- Following sections use `section-enter` plus delay helpers such as `section-delay-1` through `section-delay-4`.
- Use `glass-panel` for primary sections.
- Use `glass-card` for nested content inside a section.

### Navigation

- Top nav is sticky and wrapped in a `glass-panel`.
- Nav items are rounded pill/card-like links.
- Active route uses `glass-btn-primary`.
- Inactive routes use `glass-card`.

## Typography Rules

- Page titles: `text-2xl font-semibold`
- Section titles: `text-lg font-semibold`
- Labels/meta: `text-xs uppercase tracking-*`
- Supporting copy: `text-sm text-slate-600` or `text-slate-700`
- Key numeric values: `text-2xl font-semibold`

Prefer existing slate text classes instead of sprinkling custom light/dark text toggles in component markup.

## Motion Rules

The app uses motion, but lightly.

- `page-enter` for page-level entrance
- `section-enter` for section-level stagger
- `section-delay-*` for sequencing
- `AnimatePresence` and `motion.div` for expand/collapse details

Keep motion subtle, brief, and helpful for orientation. Prefer fade, slide, and height transitions over dramatic animation.

## Loading, Empty, and Feedback States

### Loading

- Use `LiquidLoader` for prominent loading states.
- Use `glass-loader`, `glass-loader-line`, and `glass-loader-dot` for inline/skeleton-like loading blocks.

### Empty states

- Use a simple `glass-card` or `glass-panel` with concise explanatory text.

### Errors

- Inline errors typically use a rounded container with red border/background and `text-sm` copy.

### Success/info feedback

- Use the shared toast system from `lib/toast-context.tsx` for transient operation feedback.
- Prefer toasts over ad-hoc success banners for routine CRUD feedback.

## Responsive Behavior

- Design mobile-first.
- Prefer wrapping layouts and stacked sections over forcing horizontal overflow.
- Use `flex-wrap`, grid breakpoints, and inline expansion patterns.
- Preserve the current rooms/hostel behavior of expanding details inline instead of relying on sticky side panels or forced scroll jumps.

## Reuse Before Reinventing

Before creating a new visual pattern, check whether one of these already solves it:

- `glass-panel`
- `glass-card`
- `glass-chip`
- `glass-btn-primary`
- `glass-btn-secondary`
- `glass-btn-danger`
- `Input`
- `Select`
- `Button`
- `LiquidLoader`
- page/section entrance classes

If a new pattern is needed repeatedly, add it centrally in `app/globals.css` or in `components/ui/` instead of duplicating class strings across screens.

## Implementation Rules for Future Agents

### Do

- reuse shared glass classes
- use the shared input/select/button primitives for standard controls
- use slate text tokens already common in the app
- preserve rounded corners, blur, and soft shadow language
- add motion only when it helps orientation
- keep dark mode working through existing theme infrastructure
- follow current page spacing and width patterns

### Avoid

- introducing a second visual language
- adding bright saturated colors outside the existing blue/rose accent usage
- using flat gray boxes when a glass surface should be used
- sprinkling one-off dark mode classes everywhere
- replacing shared primitives with raw controls without a good reason
- using heavy animation or sticky side-panel interactions that fight the current UX direction

## Quick Checklist

When adding a new page or UI block, verify:

- Is the main page using `page-enter`, width constraints, and `space-y-6`?
- Are major sections using `glass-panel`?
- Are nested items using `glass-card`?
- Are small metadata items using `glass-chip`?
- Are forms using shared primitives?
- Are primary/secondary/destructive actions using the correct glass button style?
- Does the UI still look correct in both light and dark theme?
- Is motion subtle and optional rather than dominant?

## Source Files to Reference

- `app/globals.css`
- `app/layout.tsx`
- `lib/theme-context.tsx`
- `app/components/theme-toggle.tsx`
- `app/components/top-nav.tsx`
- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/select.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/home-ai-assistant.tsx`
- `app/(dashboard)/rooms/rooms-dashboard-client.tsx`
- `app/(dashboard)/hostel/hostel-config-client.tsx`
- `app/(dashboard)/electricity/settings/settings-client.tsx`

If a future implementation conflicts with this guide, prefer the current shared styles in code and then update this document to match the new consensus.
