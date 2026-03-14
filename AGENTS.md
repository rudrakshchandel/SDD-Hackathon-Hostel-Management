# Repository Notes

## Scope
- Root instructions apply to the full repository unless a nested `AGENTS.md` overrides them.

## Styling Guide
- When working on UI, consult `docs/ui-style-guide.md` for the current glassy theme, button/form primitives, and motion/spacing rules.
- Keep doc updated when introducing new visual patterns so future agents can keep styling consistent.

## Database & Getting Started
- This project targets a PostgreSQL-compatible database (Neon is the preferred cloud provider) and uses Prisma as the ORM.
- Check `README.md` for the Neon setup steps, including the required env vars such as `DATABASE_URL`, `DIRECT_URL`, and auth-related keys.
- Basic workflows:
  - `npm install` to get dependencies.
  - `npm run db:setup` to push the schema and seed sample data (runs `prisma db push` + `prisma/seed.js`).
  - `npm run dev` to start the Next.js app locally.
  - `npm run lint` / `npm run test` / `npm run build` for verification.

## API & Caching Patterns
- Centralize HTTP calls through the `api` helper in `lib/api-client.ts`, ensuring every route returns `{ data }` and errors surface uniformly.
- Client code should prefer the existing primitives that wrap `api` (see `app/(dashboard)/*` components); avoid manually calling `fetch` unless absolutely necessary.
- Use `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient`) for querying/caching, and keep cache updates tight by invalidating queries or updating data via `queryClient.setQueryData` after mutations.
- Prefer reusing shared server helpers in `lib/` when implementing API routes under `app/api/` instead of duplicating logic.
