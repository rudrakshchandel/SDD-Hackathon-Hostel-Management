# App Module Notes

## Scope
- `app/` contains Next.js routes, layouts, API handlers, and UI composition.

## Guardrails
- Keep route handlers thin; move domain logic to `lib/`.
- For interactive UI, prefer client components only where state/events are required.
- Preserve glass theme classes and shared motion patterns (`page-enter`, `section-enter`).

## Validation
- Run `npm run lint` and `npm run build` after route/UI changes.

