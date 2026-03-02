# Lib Module Notes

## Scope
- `lib/` contains shared business logic, data fetch helpers, and API utility code.

## Guardrails
- Keep parsing/classification helpers pure and testable.
- Avoid direct UI concerns in this module.
- Reuse existing helper entry points from API handlers instead of duplicating logic.

## Validation
- Add/update unit tests in `tests/` for all new pure helpers.

