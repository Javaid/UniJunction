# Development Guidelines

Source of truth for coding conventions on Academic Connect. Read this
before starting any new chunk of work — including future Claude Code
sessions picking up where a previous chunk left off.

## General Principles

1. **JavaScript only.** No TypeScript, anywhere, in either app.
2. **Modular monolith, not microservices.** New backend domains live
   under `server/src/modules/<domain>` and stay self-contained.
3. **No premature abstraction.** Don't build a generic solution for a
   problem you have once. Three similar lines beat a speculative helper.
4. **No speculative features.** Implement what the current chunk asks
   for — don't add "while I'm here" functionality.
5. **Never hard-code configuration or secrets.** Everything environment-
   specific goes through `process.env` (backend) or `import.meta.env`
   (frontend), read through the existing config modules
   (`server/src/config/env.js`, never `process.env` scattered elsewhere).

## Backend Conventions

- **Controllers** parse the request and shape the response. They must
  not contain business logic, database queries, or validation logic.
- **Services** hold business logic. They are plain functions, framework-
  agnostic where possible, and are what controllers call.
- **Validators** use Joi. Validate at the boundary (incoming
  requests) — do not re-validate internal service-to-service calls.
- **Models** are Sequelize models, one file per model
  (`server/src/models/<name>.model.js`, e.g. `user.model.js`), registered
  and associated in `server/src/models/index.js`. Database access from
  controllers is not allowed; go through a service, which calls the
  model. See [`database-guidelines.md`](./database-guidelines.md) for
  naming conventions, primary-key/foreign-key/soft-delete strategy, and
  indexing — follow it for every new model rather than improvising a
  new convention per table.
- **Errors:** throw `ApiError(statusCode, message)` from
  `server/src/utils/ApiError.js` for any expected failure condition
  (not found, validation failure, unauthorized, etc). Let it propagate to
  the centralized `errorHandler` — do not catch-and-respond inside every
  controller.
- **Logging:** use `server/src/utils/logger.js`, not raw `console.log`.
- **Async code:** always `async/await`, never raw `.then()` chains, and
  always let errors propagate (Express 4 route handlers should be
  wrapped or use try/catch that forwards to `next(err)`).
- **New route checklist:** add a validator (if it takes input), a service
  function, a controller function, register the route in the domain's
  `*.routes.js`, and mount that router in `server/src/routes/index.js`.

## Frontend Conventions

- **Pages** (`src/pages`) are route-level components — thin, composed of
  smaller pieces. Real feature logic belongs in `src/features/<domain>`
  once that domain exists.
- **State:** use Redux Toolkit slices for state shared across the app
  (auth session, cross-page data). Local component state (`useState`) is
  fine for state that doesn't need to be shared.
- **API calls:** always go through `src/services/apiClient.js` (the
  shared Axios instance). Do not create new Axios instances per feature.
  Add one service file per domain (e.g. `usersService.js`) exporting
  named async functions.
- **Styling:** Tailwind CSS utility classes. Avoid inline styles. Keep
  the visual language restrained — see "UI Direction" below.
- **Component boundaries:** a component that fetches data, manages
  loading/error state, and renders should usually be split into a
  container (data) and presentational piece once it grows past a page.
  Don't split prematurely for a small placeholder page.

## UI Direction

Academic Connect should read as a serious academic platform, not a
consumer social app:

- Clean, minimal, professional, accessible, responsive.
- Avoid gradients, heavy shadows, excessive rounding, decorative
  animation, and card-everything layouts.
- Prefer clear typography and whitespace over visual ornamentation.

## Testing

- **Backend:** Jest + Supertest. Every new route needs at least one test
  exercising its happy path and its main failure path. Run with
  `npm test` inside `/server`.
- **Frontend:** Vitest + React Testing Library. Smoke-test that new pages
  render without throwing; add interaction tests as features grow. Run
  with `npm test` inside `/client`.
- Tests must not depend on a live database or a running sibling server —
  mock or stub external calls.

## Git & Commit Hygiene

- Keep commits scoped to one logical change.
- Never commit a real `.env` file or any credential.
- Update `.env.example` whenever a new environment variable is
  introduced.
- Update `docs/architecture.md` when a chunk changes the system's
  structure (new domain, new cross-cutting concern), not for routine
  feature work within an existing structure.

## Adding a New Domain (Future Chunks)

When a chunk introduces a new domain (e.g. `users`):

**Backend** — create `server/src/modules/users/` containing:
`users.routes.js`, `users.controller.js`, `users.service.js`,
`users.validator.js`. Mount it in `server/src/routes/index.js`.

**Frontend** — create `client/src/features/users/` containing the
slice (`usersSlice.js`), and add a service file in `client/src/services`.
Add pages under `client/src/pages` and wire routes in
`client/src/routes/AppRoutes.jsx`.

Do not scaffold a new domain's files ahead of the chunk that implements
it — empty placeholder modules add noise without value.
