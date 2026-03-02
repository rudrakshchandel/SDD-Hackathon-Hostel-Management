# Prisma Module Notes

## Scope
- `prisma/` defines schema and seed data for hostel management entities.

## Guardrails
- Prefer additive schema changes for backward compatibility.
- Keep seed data realistic and consistent with Indian hostel operations.
- Update `seed.js` reset logic when new models are introduced.

## Validation
- Run `npx prisma generate` after schema changes.
- Apply schema updates with `npm run db:push` before testing runtime features.

