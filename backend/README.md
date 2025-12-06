# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


## Backend API: Import and Resolve Changes

- Resolve comment requirement: When making a `PUT /cases/{id}` request that changes a case's status to a resolved state (e.g. `Completed`, `Closed`), include a `resolve_comment` field in the JSON payload. The server validates that `resolve_comment` is present when updating to a resolved state and will return a 400 if missing.
### Fix: Empty email normalization
- The server now normalizes empty string emails to `null` before returning users/cases to avoid Pydantic `EmailStr` validation errors which could result in a 500 Internal Server Error in the UI.
### Relax response email validation
- The API response model for users (`UserRead`) now allows any string for `email` (i.e., not strictly validated by `EmailStr`) to avoid 500 errors when sysadmin-created accounts or legacy records include non-standard/reserved domains such as `admin@hlp.local`.
- Input validation for `POST /users` and `PUT /users/{id}` still uses `EmailStr` to validate user-provided emails.

- Import endpoint: The `/api/import` endpoint now stores `ImportJob` and `ImportRow` records and returns clearer, per-row statuses (pending, success, skipped, failed). The server attempts deduplication using JSON path queries where supported; if the DB dialect doesn't support `astext` JSON path operations (e.g. SQLite), the backend falls back to Python scanning of `raw` values for duplicates.
- Notes on deletion: Deleting a case (`DELETE /cases/{id}`) will remove database references (null import rows) and delete comments prior to deleting the case to avoid FK constraint errors.

### DB availability and 503 responses
- If the backend cannot connect to the configured database instance (for example, the DB is down or the `DATABASE_URL` is misconfigured), the API now returns HTTP 503 (Service Unavailable) for endpoints that rely on DB queries (`GET /api/users`, `GET /api/cases`, etc.). See `docker compose logs backend --tail 200` for the backend error trace if you receive 503 responses.


## Testing the API changes

- To test Resolve comment validation:
	1. Create a case or locate one in the DB.
	2. Attempt to `PUT /cases/{id}` with a payload that sets `status` to `Completed` but omit `resolve_comment`. The server should respond 400 with a message that `resolve_comment` is required.
	3. Re-run with `resolve_comment` included; the update should succeed and create a comment record.

---
