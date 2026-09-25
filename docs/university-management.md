# University Management (Chunk 04)

This document covers the institutional administration domain added in
Chunk 04: university lifecycle, verification, institutional hierarchy
(faculties/departments/programs), membership, multi-tenancy, resource
ownership, and university-scoped authorization. Read it alongside
[`architecture.md`](./architecture.md), [`authentication.md`](./authentication.md)
(global RBAC — this chunk builds on top of it, not instead of it), and
[`database-guidelines.md`](./database-guidelines.md) /
[`database-erd.md`](./database-erd.md) for schema detail.

## 1. Scope

Implemented in this chunk: university CRUD, university operational status,
university verification, university email domains, faculties, departments,
programs, university membership, university administrator assignment, a
reusable university-scoped authorization service, and an audit log
foundation.

**Explicitly not implemented** (see §11): student/faculty profile detail,
research, courses, skills, interests, publications, projects, mentorship,
messaging, events, opportunities, AI/recommendations, a social feed, SSO/
OAuth, or a mobile app. The membership APIs in this chunk are a
foundation only — not a full public user-profile system.

## 2. Role vs. Membership — the core distinction

Two independent concepts are easy to conflate and are kept strictly
separate throughout this codebase:

- **Role** (`roles` / `user_roles` / `role_permissions`, from Chunk 03) —
  a **global platform capability**. Holding the `UNIVERSITY_ADMIN` role
  says a user is *the kind of person* who administers a university
  somewhere; it says nothing about *which* university.
- **Membership** (`university_memberships`, new in this chunk) — a
  user's **institutional affiliation**: which university, in what
  capacity (`membership_type`: `STUDENT` / `FACULTY` / `RESEARCHER` /
  `STAFF` / `ADMIN`), and its lifecycle `status` (`PENDING` / `ACTIVE` /
  `SUSPENDED` / `ENDED`).

**Role must never be used to infer membership, and vice versa.** A user
can hold the `UNIVERSITY_ADMIN` role without an active `ADMIN` membership
anywhere (e.g. it was revoked), and a user can hold an `ADMIN`-type
membership record that predates or outlives their global role. University-
scoped authorization (§8) is the one place both are checked together —
see `assertUniversityAccess`.

A user can hold multiple memberships across different universities (and
even multiple membership types at the same university — the unique key
is `(user_id, university_id, membership_type)`), but **only one
membership may be `is_primary` at a time, globally across all of a user's
universities.** MySQL has no partial/filtered unique index to express
"at most one row WHERE is_primary = true", so this is enforced at the
service layer: `setPrimaryExclusively()`
(`server/src/modules/university/membership.service.js`) unsets
`is_primary` on every other membership for that user, in the same
transaction as the write that sets it.

## 3. University lifecycle

`universities.status` (`PENDING` / `ACTIVE` / `SUSPENDED` / `DEACTIVATED`)
is the **operational** dimension — is this institution usable on the
platform right now. Semantics are documented here only; no complex
downstream behavior (e.g. blocking logins for members of a suspended
university) exists yet in this chunk.

```
PENDING      → newly created, not yet reviewed
ACTIVE       → normal operation
SUSPENDED    → temporarily disabled (policy violation, billing, etc.)
DEACTIVATED  → permanently retired, but never hard-deleted
```

Changed via `PATCH /api/universities/:id/status` (`UNIVERSITY_STATUS_UPDATE`,
SUPER_ADMIN only — see §9). Every change is audited
(`UNIVERSITY_STATUS_CHANGED`, metadata `{ from, to }`).

**No hard deletion exists anywhere in this domain.** Removing a university,
faculty, department, program, or membership always means soft-delete
(`deleted_at`, Sequelize `paranoid: true`) — see
`database-guidelines.md` §6. There is no `DELETE /api/universities/:id`
endpoint at all; `DEACTIVATED` is the "this institution is done" terminal
status while the row (and its history) remains queryable by direct DB
access / future admin tooling.

## 4. University verification

`universities.verification_status` (`UNVERIFIED` / `PENDING` / `VERIFIED`
/ `REJECTED`) is a **separate dimension from `status`** — a university
can be `ACTIVE` and `UNVERIFIED` at the same time (e.g. self-registered,
operating, but not yet institutionally confirmed). The two are
independent by design: verification answers "do we trust this is a real
institution," status answers "is it currently allowed to operate."

Changed via `PATCH /api/universities/:id/verification`
(`UNIVERSITY_VERIFY`, SUPER_ADMIN only). Setting the value to `VERIFIED`
stamps `verified_at = now()`; setting it to anything else clears
`verified_at` back to `null`. Audited as `UNIVERSITY_VERIFICATION_CHANGED`
(metadata `{ from, to }`). There is no external verification integration
— this is a manual, SUPER_ADMIN-only judgment call in this chunk.

## 5. Institutional hierarchy

```
University
 └─ Faculty (optional grouping layer)
     └─ Department (faculty_id optional — a department can sit directly
        under a university with no faculty layer)
         └─ Program (department_id required; faculty_id/university_id
            carried directly too, so "all programs at university X"
            never requires walking an optional faculty relationship)
```

Each level has: list (public, paginated), create (scoped, `*_CREATE`
permission), update (scoped, `*_UPDATE`), and a status toggle (scoped,
`*_STATUS_UPDATE`, using the shared `ORG_UNIT_STATUS` enum: `ACTIVE` /
`INACTIVE` — a different, simpler vocabulary than a university's own
operational status). All four levels are `paranoid: true`.

Two routing shapes exist for faculty/department/program, both backed by
the same service layer:

- **Nested**, for listing/creating under a known parent:
  `GET/POST /api/universities/:universityId/faculties` (and
  `/departments`, `/programs`).
- **Flat**, for addressing a specific resource directly once its own id
  is known: `GET/PUT /api/faculties/:id`,
  `PATCH /api/faculties/:id/status` (and the `/departments`, `/programs`
  equivalents).

**Ownership is always re-resolved server-side, never trusted from the
client.** A flat `PUT /api/faculties/:id` doesn't receive a
`university_id` in its body at all — the service loads the faculty by
its own id, reads *its* `university_id`, and calls
`assertUniversityAccess(user, faculty.universityId)` before allowing the
update. This is what makes it safe for a `UNIVERSITY_ADMIN` to hit a flat
endpoint: the check happens after the resource (and therefore its real
university) is resolved, not before.

**Cross-university parent references are rejected, not silently
corrected.** Creating a department with a `faculty_id` that's real but
belongs to a *different* university, or a program with a
`department_id` from another university, returns `400` via
`assertResourceBelongsToUniversity()` (§8) — never a 500, and never a
silent reassignment.

**No silent reassignment via ordinary update.** `updateFacultySchema` /
`updateDepartmentSchema` / `updateProgramSchema`
(`server/src/modules/university/institution.validator.js`) exclude
`university_id` from every ordinary update payload (stripped via Joi's
`stripUnknown`), so a client can never move a faculty/department/program
to a different university through the normal update endpoint. (A
department's `faculty_id` *can* be changed via update — re-validated
against the department's own university when it is.)

`Program.degree_level` is validated against an **extensible allow-list**
(`DEGREE_LEVELS` in `server/src/utils/enums.js`), not a MySQL `ENUM` and
not hard-coded into the frontend — adding a new degree level is a one-line
change to that array plus (optionally) the frontend's `DEGREE_LEVELS`
display list in `UniversityProgramsPage.jsx`, never a schema migration.

## 6. University email domains

`university_domains` stores **bare hostnames only** (e.g. `mit.edu`),
never full email addresses — validated by a strict pattern
(`DOMAIN_PATTERN` in `domain.validator.js`) that rejects anything
containing `@`, a scheme, or a path. Domains are normalized to lowercase
before storage and comparison.

Domains are **globally unique**, not unique per university — DNS domains
are inherently a global namespace, so `mit.edu` can only ever belong to
one university record on the platform, full stop.

`GET/POST /api/universities/:id/domains`, `DELETE .../:id/domains/:domainId`
— all require `UNIVERSITY_DOMAIN_VIEW`/`UNIVERSITY_DOMAIN_MANAGE` plus
`assertUniversityAccess` (SUPER_ADMIN, or the owning UNIVERSITY_ADMIN
only — these reads are **not public**, unlike university/faculty/
department/program reads). Adding a domain with `is_primary: true`
atomically unsets any other primary domain for that university in the
same transaction. Removal is a soft-delete; audited as
`UNIVERSITY_DOMAIN_ADDED` / `UNIVERSITY_DOMAIN_REMOVED`.

## 7. Multi-tenancy — shared database, cross-university discovery

Academic Connect remains **shared-database, shared-schema** multi-tenancy
(see `database-guidelines.md` §9) — this chunk does not introduce
per-university database or schema isolation, and never will, because the
platform's core value is cross-university discovery (a student at
University A must remain discoverable by a researcher at University B).
`university_id` is a **logical** tenant boundary, expressed as a foreign
key column and enforced in the service layer, not a physical one.

Reads of universities, faculties, departments, and programs are
**public** (no authentication required) for exactly this reason — see
§9. Only membership, domains, and every mutating operation are
tenant-scoped.

## 8. Resource ownership & the university-scoped authorization service

Every university-scoped mutation follows the same sequence, with no
exceptions and no shortcuts:

```
authenticate (requireAuth)
  → verify global permission (requirePermission)
  → resolve the actual resource from its own id (never trust a client-
    supplied parent id)
  → determine that resource's university (resource.universityId)
  → verify university access for that specific university
  → perform the operation
```

The middle three steps are centralized in
`server/src/modules/university/access.service.js` so this logic is never
duplicated per-controller:

- **`assertUniversityAccess(user, universityId)`** — throws `403` unless:
  - `user.roles` includes `SUPER_ADMIN` (unconditional, no membership
    required), **or**
  - `user.roles` includes `UNIVERSITY_ADMIN` **and** the user holds an
    `ACTIVE`, `ADMIN`-type `UniversityMembership` at that *specific*
    `universityId` (looked up fresh on every call — never cached, never
    inferred from the role alone).
  - Everyone else: denied.
- **`assertResourceBelongsToUniversity(resource, universityId, entityName)`**
  — throws `400` if a referenced sub-resource (a `faculty_id` or
  `department_id` supplied when creating a child) doesn't actually belong
  to the target university. This is what stops a client from attaching a
  program to a real department that happens to belong to someone else's
  institution.

`requireUniversityAccess(paramName)` (`university.middleware.js`) wraps
`assertUniversityAccess` as Express middleware for the routes that
resolve their university directly from a URL param (`:id`); everywhere
else (flat faculty/department/program routes), the service layer calls
`assertUniversityAccess` itself once it has resolved the resource.

## 9. Permissions

Chunk 04 adds these permissions (seeded in `database/seed_rbac.sql`),
on top of Chunk 03's `USER_VIEW`, `USER_UPDATE`, `ROLE_VIEW`,
`ROLE_ASSIGN`, `SYSTEM_ADMIN`:

| Permission | Meaning |
|---|---|
| `UNIVERSITY_VIEW` | View university records |
| `UNIVERSITY_CREATE` | Create a university |
| `UNIVERSITY_UPDATE` | Update a university's own fields |
| `UNIVERSITY_VERIFY` | Change verification status |
| `UNIVERSITY_STATUS_UPDATE` | Change operational status |
| `UNIVERSITY_ADMIN_VIEW` | View a university's administrators |
| `UNIVERSITY_ADMIN_ASSIGN` | Assign a university administrator |
| `UNIVERSITY_MEMBER_VIEW` / `_CREATE` / `_UPDATE` | Institutional memberships |
| `UNIVERSITY_DOMAIN_VIEW` / `_MANAGE` | Registered email domains |
| `FACULTY_VIEW` / `_CREATE` / `_UPDATE` / `_STATUS_UPDATE` | Faculties |
| `DEPARTMENT_VIEW` / `_CREATE` / `_UPDATE` / `_STATUS_UPDATE` | Departments |
| `PROGRAM_VIEW` / `_CREATE` / `_UPDATE` / `_STATUS_UPDATE` | Programs |

**Role → permission mapping** (also in `seed_rbac.sql`):

- **`SUPER_ADMIN`** — all of the above (29 permissions total, including
  Chunk 03's).
- **`UNIVERSITY_ADMIN`** — everything *except* `UNIVERSITY_CREATE`,
  `UNIVERSITY_VERIFY`, `UNIVERSITY_STATUS_UPDATE`, and
  `UNIVERSITY_ADMIN_ASSIGN` (21 permissions). These four are deliberately
  withheld: a university admin manages *their own* institution's content
  and membership, but cannot create new institutions, self-verify, change
  their own operational status, or grant themselves/others the
  administrator role.
- **`STUDENT` / `FACULTY` / `RESEARCHER`** — `USER_VIEW` +
  `UNIVERSITY_VIEW` only (read access; no institutional management).

Remember: a permission is necessary but never sufficient for a
university-scoped action — `assertUniversityAccess` (§8) is the second,
independent gate.

## 10. API surface

All list endpoints are paginated (`page`, `pageSize`, max `pageSize`
100), support `search` where documented, and sort only via a
server-side **whitelist** of columns — a client can never supply an
arbitrary `ORDER BY` column. All search filtering goes through
parameterized Sequelize `Op.like`/`Op.or` queries; there is no raw SQL
string concatenation anywhere in this domain.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/universities` | public (`optionalAuth`) | search, `status`, `verification_status`, `country`, `city`, whitelisted `sortBy`/`sortDir` |
| GET | `/api/universities/:id` | public (`optionalAuth`) | richer "admin" view if the caller is authorized (§ below) |
| POST | `/api/universities` | `UNIVERSITY_CREATE` | SUPER_ADMIN only |
| PUT | `/api/universities/:id` | `UNIVERSITY_UPDATE` + scoped | excludes slug/status/verification |
| PATCH | `/api/universities/:id/status` | `UNIVERSITY_STATUS_UPDATE` + scoped | SUPER_ADMIN only (§9) |
| PATCH | `/api/universities/:id/verification` | `UNIVERSITY_VERIFY` + scoped | SUPER_ADMIN only (§9) |
| GET/POST | `/api/universities/:id/domains` | `UNIVERSITY_DOMAIN_VIEW`/`_MANAGE` + scoped | not public |
| DELETE | `/api/universities/:id/domains/:domainId` | `UNIVERSITY_DOMAIN_MANAGE` + scoped | soft-delete |
| GET | `/api/universities/:id/faculties` \| `/departments` \| `/programs` | public | nested list |
| POST | `/api/universities/:id/faculties` \| `/departments` \| `/programs` | `*_CREATE` + scoped | nested create |
| GET | `/api/faculties/:id` \| `/departments/:id` \| `/programs/:id` | public | flat read |
| PUT | `/api/faculties/:id` \| `/departments/:id` \| `/programs/:id` | `*_UPDATE` | ownership checked after resolving the resource |
| PATCH | `/api/faculties/:id/status` \| `/departments/:id/status` \| `/programs/:id/status` | `*_STATUS_UPDATE` | same |
| GET/POST | `/api/universities/:id/members` | `UNIVERSITY_MEMBER_VIEW`/`_CREATE` + scoped | not public |
| PATCH | `/api/universities/:id/members/:membershipId` | `UNIVERSITY_MEMBER_UPDATE` + scoped | 404 if the membership doesn't belong to `:id` |
| GET | `/api/users/me/universities` | `requireAuth` | caller's own memberships, all statuses |
| GET | `/api/users/:userId/universities` | `requireAuth` | another user's memberships, `ACTIVE` only (deliberately limited public view) |
| POST | `/api/admin/universities/:universityId/admins` | `UNIVERSITY_ADMIN_ASSIGN` | SUPER_ADMIN only; transactional |
| GET | `/api/admin/universities/:universityId/admins` | `UNIVERSITY_ADMIN_VIEW` + scoped | SUPER_ADMIN, or the university's own UNIVERSITY_ADMIN |

**Public vs. admin serialization** (`university.serializer.js`):

- **Public** (unauthenticated, or authenticated without access to this
  university): `name`, `short_name`, `logo_url`, `website_url`,
  `description`, `country`, `state_province`, `city`, `status`.
- **Admin** (SUPER_ADMIN, or the university's own UNIVERSITY_ADMIN):
  everything public, plus `email_domain`, `address`, `postal_code`,
  `verification_status`, `verified_at`, `created_at`, `updated_at`.
  Security/audit metadata (internal `id`, soft-delete state) is never
  serialized to any caller, admin or not.

**Response shape:** `{ success: true, data, pagination? }` on success
(pagination present on list endpoints: `{ page, pageSize, total,
totalPages }`); `{ success: false, message }` on error, consistent with
the shape established in Chunks 02–03 (see `authentication.md`).

## 11. University administrator assignment

`assignUniversityAdmin(university, targetUserUuid, actorUser)`
(`admin-assignment.service.js`) is the **only** path that grants
`UNIVERSITY_ADMIN` administration of a specific institution, and it does
so transactionally and explicitly — nothing "silently invents" a
membership:

1. Loads and validates the target user (must be `ACTIVE`).
2. `findOrCreate`s an `ACTIVE`, `ADMIN`-type `UniversityMembership` for
   that user at that university.
3. Grants the global `UNIVERSITY_ADMIN` role if the user doesn't already
   hold it.
4. Records `UNIVERSITY_ADMIN_ASSIGNED` to the audit log.

All four steps run inside one `sequelize.transaction()`. This is the
concrete mechanism behind §2's rule that role and membership are
independent but assignment establishes both together deliberately.

`listUniversityAdmins(university)` returns every user with an `ACTIVE`
`ADMIN`-type membership at that university, serialized with their full
current role list (not inferred from the membership).

## 12. Audit logging

`audit_logs` is a focused, append-only foundation — not a general
event-sourcing framework. No `uuid` column (never addressed by id from
any endpoint), no `paranoid`, no `updated_at`. Columns: `actor_user_id`
(nullable — `SET NULL` if the actor is later removed), `action`,
`entity_type`, `entity_id`, `university_id` (nullable), `metadata`
(JSON), `created_at`.

The single writer is `recordAuditLog()`
(`server/src/services/audit.service.js`), always called inside the same
transaction as the change it records. Actions recorded in this chunk:

```
UNIVERSITY_CREATED, UNIVERSITY_UPDATED, UNIVERSITY_STATUS_CHANGED,
UNIVERSITY_VERIFICATION_CHANGED, UNIVERSITY_DOMAIN_ADDED,
UNIVERSITY_DOMAIN_REMOVED, UNIVERSITY_ADMIN_ASSIGNED,
FACULTY_CREATED, FACULTY_UPDATED, FACULTY_STATUS_CHANGED,
DEPARTMENT_CREATED, DEPARTMENT_UPDATED, DEPARTMENT_STATUS_CHANGED,
PROGRAM_CREATED, PROGRAM_UPDATED, PROGRAM_STATUS_CHANGED,
MEMBERSHIP_CREATED, MEMBERSHIP_STATUS_CHANGED
```

## 13. Frontend

New pages under `client/src/pages/admin/`, all guarded by `AdminRoute`
(`client/src/routes/AdminRoute.jsx` — redirects to `/login` if
unauthenticated, `/dashboard` if authenticated but neither `SUPER_ADMIN`
nor `UNIVERSITY_ADMIN`) and shelled by `AdminLayout`
(`client/src/layouts/AdminLayout.jsx`, a sidebar nested inside the
existing `MainLayout`):

```
/admin                                   → AdminDashboardPage
/admin/universities                      → UniversitiesListPage
/admin/universities/:id                  → UniversityDetailPage
/admin/universities/:id/faculties        → UniversityFacultiesPage
/admin/universities/:id/departments      → UniversityDepartmentsPage
/admin/universities/:id/programs         → UniversityProgramsPage
/admin/universities/:id/members          → UniversityMembersPage
```

`MainLayout` shows an "Admin" nav link only when the current user's roles
include `SUPER_ADMIN` or `UNIVERSITY_ADMIN`.

**`AdminDashboardPage`** renders one of two simple stat displays (§ the
brief's "no analytics infrastructure" instruction — plain counts only):
a Super Admin view (total/active/pending-verification/suspended
universities, total users) or a University Admin view (that admin's own
university's student/faculty/researcher/department/program counts, with
a link into that university's detail page).

**`Can`** (`client/src/components/Can.jsx`) conditionally renders based
on `state.auth.user.permissions` (populated at login/`/auth/me` via the
backend's `toAuthenticatedUser` serializer — see §14). **This is a UI
convenience only, not a security control** — every permission `Can`
checks is independently and unconditionally re-enforced by the backend
on every request, regardless of what the frontend shows or hides. Hiding
a "Delete" button does not, and must never be relied on to, prevent the
underlying request.

Route protection is centralized in `AdminRoute` (one gate covering the
whole `/admin/*` subtree) rather than duplicated per-page; page-level
`Can` checks then govern individual actions (create/edit/status buttons)
within a page every admin role can otherwise reach.

State approach: admin list/detail pages use local component state and
direct service calls (`universityService.js`, `adminService.js`), not
new Redux slices — consistent with this project's existing convention
that state which doesn't need to be shared across components doesn't
need to live in the store.

## 14. Authenticated user permissions (backend)

`toAuthenticatedUser()` (`server/src/utils/userSerializer.js`) extends
`toPublicUser()` with the caller's own effective `permissions` (the union
of every role's permissions) and is used **only** for a user's own
session context — `login` and `/auth/me`. Viewing *other* users (e.g. an
admin listing) continues to use plain `toPublicUser()`, which never
includes permissions — there is no legitimate reason for a client to see
another user's permission set.

## 15. Security properties (see also `security.test.js`)

- A `UNIVERSITY_ADMIN` of University A gets `403` on every mutating
  endpoint scoped to University B (update, status change, verification
  attempt, domain management, admin assignment/listing, faculty/
  department/program create and update, membership update) — verified
  both by the automated `security.test.js` suite and by live manual
  testing against a running instance.
- Attempting to `PATCH` a membership using University A's `:id` in the
  URL but a membership id that actually belongs to University B returns
  `404`, not `403` or a silent no-op — the membership is resolved and its
  real university checked before any authorization decision is made.
  Same pattern for cross-university faculty/department/program ids.
  This is a deliberate choice to avoid confirming or denying the
  *existence* of a resource across a tenant boundary the caller isn't
  authorized to see.
- Supplying a `department_id`/`faculty_id` belonging to a different
  university when creating a program/department returns `400`
  (`assertResourceBelongsToUniversity`), not a silent cross-university
  attach.
- There is no endpoint capable of hard-deleting a university, faculty,
  department, program, or membership — soft-delete only.
- Invalid `status`/`verification_status` values are rejected by Joi
  validation (`400`) before ever reaching the service layer.
- Every list endpoint's `sortBy` is validated against a fixed whitelist;
  an unrecognized value is rejected by Joi rather than passed through to
  Sequelize's `ORDER BY`.

## 16. What Chunk 04 deliberately does not include

Per scope: student/faculty/researcher profile detail beyond membership
type, research, courses, skills, interests, publications, projects,
mentorship, messaging, events, opportunities, AI/recommendations, a
social feed, SSO/OAuth, or a mobile app. The membership API
(`/api/users/me/universities`, `/api/users/:userId/universities`) is a
foundation for those future profile features, not a replacement for
them — there is deliberately no user search/autocomplete UI yet (the
admin "Add Member" form takes a raw user id), since building that well
depends on the public profile system this chunk explicitly excludes.

Also not implemented in this chunk, though designed for: enforcing
`university_domains` against a user's email at registration time (e.g.
auto-suggesting or auto-verifying a membership based on a `@mit.edu`
address) — the domains table exists and is fully CRUD-able, but nothing
yet reads it during registration.
