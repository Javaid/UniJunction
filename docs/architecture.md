# Academic Connect — Architecture (Chunk 01: Foundation)

This document describes the foundation established in Chunk 01. It will be
extended as later chunks add domains, but the structural decisions here
are meant to hold for the life of the project.

## 1. System Overview

Academic Connect is a multi-university academic networking platform,
delivered as a **monorepo** with two independently runnable applications:

```
/client   React + Vite single-page application
/server   Node.js + Express API
/docs     Architecture and process documentation
```

The client and server communicate exclusively over HTTP, through a
versionless `/api` namespace (e.g. `/api/health`). The client never talks
to the database directly.

## 2. Frontend Architecture

- **Build tool:** Vite (fast dev server, ESM-based build).
- **Language:** JavaScript only — no TypeScript.
- **Routing:** React Router (`src/routes/AppRoutes.jsx`), rendered inside
  a shared `MainLayout` (`src/layouts/MainLayout.jsx`) that provides the
  header/navigation shell used by every page.
- **State management:** Redux Toolkit (`src/store`). A single root store
  is configured in `src/store/index.js`; feature domains will register
  their own slices there in later chunks (`src/features/<domain>`).
- **HTTP client:** Axios, wrapped in `src/services/apiClient.js`, which
  reads its base URL from `VITE_API_BASE_URL`. Domain-specific service
  modules (e.g. `healthService.js`) call through this shared client
  rather than instantiating Axios themselves.
- **Error handling:** A top-level `ErrorBoundary` component
  (`src/components/ErrorBoundary.jsx`) catches rendering errors so a
  single broken page cannot blank the whole app.
- **Styling:** Tailwind CSS, configured with a small `brand` color scale
  in `tailwind.config.js`. The UI direction is intentionally restrained —
  institutional and modern, not decorative.

### Directory responsibilities

| Directory            | Responsibility                                             |
|-----------------------|-------------------------------------------------------------|
| `src/app`             | Top-level `App` component composition                      |
| `src/layouts`         | Shared page chrome (header, nav, footer)                    |
| `src/pages`           | Route-level page components                                 |
| `src/routes`          | React Router route configuration                             |
| `src/components`      | Reusable, domain-agnostic UI primitives                     |
| `src/features`        | Future domain-specific Redux slices + feature UI            |
| `src/services`        | Axios client and API service wrappers                       |
| `src/store`           | Redux Toolkit store configuration                            |
| `src/hooks`           | Reusable custom hooks                                         |
| `src/utils`           | Pure helper functions                                          |

## 3. Backend Architecture — Modular Monolith

The backend is a **modular monolith**: one deployable Express application,
internally organized so that any domain can be lifted into its own
service later without a rewrite.

```
server/src/
  config/       Environment + database configuration
  controllers/  HTTP request/response handling only
  middleware/   Cross-cutting Express middleware (errors, 404s, ...)
  models/       Sequelize model registry (empty until schema chunk)
  modules/      Placeholder seam for future self-contained domains
  routes/       Route registration, mounted under /api
  services/     Business logic (domain-agnostic today)
  utils/        Shared helpers (logger, ApiError)
  validators/   Joi schemas (added as endpoints are implemented)
```

**Layering rule:** controllers stay thin — they parse the request, call a
service, and shape the response. Business logic lives in services.
Validation lives in validators (Joi). This separation is what keeps a
future extraction (e.g. pulling `messaging` into its own service) a
matter of moving a folder, not disentangling logic.

### Request flow

```
Request → helmet → cors → body parsing → morgan (logging)
        → /api routes → controller → service → (model/db)
        → response
        → (on error) centralized errorHandler
```

### Future domain modules

`server/src/modules/` is the seam for upcoming domains: `auth`, `users`,
`universities`, `departments`, `programs`, `students`, `faculty`,
`researchers`, `skills`, `interests`, `research`, `projects`,
`connections`, `mentorship`, `messaging`, `events`, `opportunities`,
`notifications`, `administration`. Each will be self-contained
(controller, routes, service, validator) and mounted in
`server/src/routes/index.js` with a single line, e.g.:

```js
router.use('/auth', authRoutes);
```

None of these domains are implemented in Chunk 01.

## 4. Database Strategy

- **Engine:** MySQL 8.x, via the `mysql2` driver.
- **ORM:** Sequelize, connected via `server/src/config/database.js`
  (connection pooling, UTC timestamps, a fixed connect timeout — see
  [`database-guidelines.md`](./database-guidelines.md) for the full
  configuration).
- **Schema is never managed by application code.** `sequelize.sync()` is
  not called anywhere, in any environment. The schema is created via the
  hand-written, reviewable [`/database/schema.sql`](../database/schema.sql)
  — see [`database-guidelines.md`](./database-guidelines.md#12-production-migration-strategy)
  for why, and [`/database/README.md`](../database/README.md) for how to
  run it.
- **Models:** `User`, `Role`, `UserRole`, `University`, `Faculty`,
  `Department`, `Program` (Chunk 02 — identity and institution), plus
  `Permission`, `RolePermission`, `RefreshToken`, `EmailVerificationToken`
  (Chunk 03 — RBAC and auth tokens). See
  [`database-guidelines.md`](./database-guidelines.md) for naming
  conventions, the primary-key strategy, foreign-key/soft-delete
  behavior, indexing, and multi-tenancy, and
  [`database-erd.md`](./database-erd.md) for the entity-relationship
  diagram. No migrations exist yet; the RBAC catalog (roles/permissions/
  role_permissions) is seeded via `database/seed_rbac.sql` — see
  [`authentication.md`](./authentication.md).
- **Configuration:** entirely environment-driven (`DB_HOST`, `DB_PORT`,
  `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, plus optional
  `DB_POOL_MAX`/`DB_POOL_MIN`/`DB_POOL_ACQUIRE`/`DB_POOL_IDLE`). No
  credentials are ever hard-coded.
- **Startup behavior:** if the database is unreachable, the server logs
  the failure and exits non-zero rather than starting in a broken state
  (graceful startup failure). At runtime, `GET /api/health` reports live
  database connectivity (`{ success, api, database }`, HTTP 503 when the
  database is down) without ever exposing connection details.

## 5. Authentication & Authorization Strategy

Implemented in Chunk 03 — full detail lives in
[`authentication.md`](./authentication.md); summarized here:

- **Stateless JWT access tokens** (`server/src/modules/auth/token.service.js`),
  short-lived (`JWT_ACCESS_EXPIRES_IN`, default 15m), minimal claims
  (`sub`, `jti`, `type`, `iat`, `exp`) — no roles, permissions, or profile
  data embedded.
- **Revocable, DB-backed refresh tokens** (`refresh_tokens` table, opaque
  random value, SHA-256-hashed for storage), supporting rotation on every
  use and immediate revocation on logout.
- **`requireAuth` middleware** (`auth.middleware.js`) resolves the
  authenticated user (with roles/permissions eager-loaded) onto
  `req.user` for every protected route, re-checking account status on
  every request rather than trusting the token's age.
- **RBAC**: `requireRole`/`requireAnyRole`/`requirePermission`/
  `requireAnyPermission` (`rbac.middleware.js`), backed by
  `roles ↔ permissions` through `role_permissions`. 401 (unauthenticated)
  and 403 (authenticated, unauthorized) are kept strictly distinct.
- **Endpoints:** `/api/auth/{register,login,verify-email,
  resend-verification,refresh,logout,me}` and the admin-only
  `/api/admin/users` (+ role assignment) endpoints — see
  `authentication.md` for the full contract, security model, and one
  explicitly-documented known limitation (`USER_VIEW` vs. the admin
  listing endpoint).
- **Frontend:** `authSlice` (Redux Toolkit) holds `user`/`accessToken`/
  `isAuthenticated` in memory only; the refresh token lives in a small
  standalone module (`services/tokenStore.js`), also memory-only —
  neither survives a page reload, a documented tradeoff (see
  `authentication.md` §13). `ProtectedRoute` gates `/dashboard`;
  `apiClient.js`'s interceptors attach the access token and perform a
  single silent-refresh-and-retry on a 401.

## 6. Environment Configuration

All configuration is environment-variable driven. `.env.example` at the
repository root documents every variable for both apps. Real `.env` files
are git-ignored and must never be committed. `server/src/config/env.js`
is the single place backend code reads `process.env` from; no other file
should call `process.env` directly.

## 7. Modular Monolith Strategy — Why

The platform's domain list (students, faculty, researchers, universities,
projects, research, connections, mentorship, messaging, events,
opportunities, ...) is large, but building it as microservices from day
one would add operational overhead before the domain model has even
stabilized. Instead:

- One deployable backend, one deployable frontend.
- Strict internal boundaries (`modules/<domain>`) so each domain's
  controller/service/validator/routes stay together.
- Domains communicate through service-layer function calls, not shared
  database writes across unrelated tables — this is what makes future
  extraction into separate services realistic if the platform's scale
  demands it.

## 8. What Chunk 01 Deliberately Does Not Include

Per the chunk scope, none of the following exist yet: authentication
logic, user/student/faculty/university management, research or project
domains, messaging, events, opportunities, database migrations/seeders,
or any recommendation/social features. This document will be extended,
not replaced, as those chunks land.

## 9. What Chunk 02 Deliberately Does Not Include

Chunk 02 established the identity/institution schema and models only —
no CRUD APIs were added for any of the new tables, no authentication
(login/registration/JWT) was implemented, and no profile, research,
project, messaging, event, or opportunity domains exist. See
[`database-guidelines.md`](./database-guidelines.md) §15 for the full
list of documented-but-not-built future schema domains.

## 10. What Chunk 03 Deliberately Does Not Include

University CRUD, student/faculty profile management, research, projects,
mentorship, events, opportunities, messaging, notifications beyond
auth-related ones, AI/recommendations, a social feed, file uploads, SSO
or third-party OAuth providers, and university email-domain enforcement.
University-scoped authorization (a `UNIVERSITY_ADMIN` restricted to only
their own university) is designed for but not implemented — see
[`authentication.md`](./authentication.md) §9, "University-scoped
authorization (future)" — since the `user ↔ university` relationship it
would depend on doesn't exist until the University Management chunk.
