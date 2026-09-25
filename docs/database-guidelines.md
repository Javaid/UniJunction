# Database Guidelines

Source of truth for how Academic Connect's database is configured,
structured, and evolved. Read this alongside
[`architecture.md`](./architecture.md) and
[`development-guidelines.md`](./development-guidelines.md) before adding
or changing any schema.

## 1. MySQL Version

**MySQL 8.0+.** Chosen for window functions, CTEs, better JSON support,
and `utf8mb4` as a sane default — all useful once search/feed-style
queries and JSON-shaped profile data show up in later chunks. SQL Server
is not used anywhere in this project.

## 2. Sequelize Version

**Sequelize 6.x** (see `server/package.json`), with `mysql2` as the
driver — the only ORM used. No second data-access library is introduced
alongside it.

## 3. Naming Conventions

- **Tables:** `snake_case`, plural (`users`, `universities`,
  `user_roles`).
- **Columns:** `snake_case` (`first_name`, `created_at`).
- Sequelize's global `define: { underscored: true }`
  (`server/src/config/database.js`) does this translation automatically —
  models are written in camelCase JS (`firstName`) and Sequelize maps it
  to `first_name` in SQL. No model should override this per-column.
- **Enums:** UPPER_SNAKE_CASE values (`ACTIVE`, `SUPER_ADMIN`).

## 4. Primary Key Strategy — Deliberate Decision

**Every table uses a `BIGINT UNSIGNED AUTO_INCREMENT` surrogate `id` as
its primary key.** In addition, entities meant to be referenced from the
public API (`users`, `universities`, `faculties`, `departments`,
`programs`, plus `university_domains` and `university_memberships` as of
Chunk 04) carry a separate `uuid` column (`CHAR(36)`, `UUIDV4`, unique,
indexed) that the API uses instead of the raw `id`.

Why a hybrid instead of picking one:

- **Indexing / MySQL performance:** InnoDB clusters a table's data
  physically around its primary key. A monotonically increasing
  `BIGINT` keeps inserts sequential (appending to the end of the
  clustered index) and keeps secondary indexes small, since every
  secondary index stores a copy of the primary key. A random `UUID` (v4)
  as the *primary* key causes page splits and index fragmentation at
  scale — a well-known MySQL/InnoDB anti-pattern.
- **API exposure:** sequential integer IDs leak information (`/users/5`
  → "the 5th user ever created") and make enumeration trivial. The
  `uuid` column gives external consumers an opaque, non-guessable
  identifier without paying the clustering cost internally — foreign
  keys and joins still use the fast integer `id`.
- **Distributed systems / future multi-region:** a plain
  auto-increment `id` does not survive multi-master or multi-region
  writes (collisions). The `uuid` column is already collision-safe and
  globally unique, so if this project ever needs multi-region writes,
  the externally-facing identifier doesn't change — only the internal
  `id`'s generation strategy would need to move to something like
  Snowflake IDs. That migration is isolated to internals; no API
  contract changes.
- **Not randomly mixed:** the rule is applied consistently — *every*
  table gets the surrogate `id`; *only* tables meant for external
  reference/discovery get a `uuid` on top. Two clear exceptions, both
  documented at the point of use:
  - `roles`, `permissions` — small, closed, admin-controlled reference
    tables. Their sequential ids pose no enumeration risk (there's
    nothing sensitive about knowing "role 3 is FACULTY"), so no `uuid`
    column. Role assignment/removal endpoints address a role by its
    `name`, not a generated id.
  - `user_roles`, `role_permissions` — pure join tables, never
    referenced by ID from a URL or API payload, so no `uuid` column.
  - `refresh_tokens`, `email_verification_tokens` — internal security
    artifacts with their own opaque, high-entropy identifier (the raw
    token itself, hashed for storage — see "Token Hashing" below); a
    second `uuid` would be redundant, and no endpoint ever addresses one
    of these rows by any id at all.
  - `audit_logs` (Chunk 04) — never addressed by id from any endpoint; a
    caller only ever queries it by `entity_type`/`entity_id`,
    `university_id`, or `actor_user_id`, never by its own row identity.

This is intentionally not a "just use UUIDs everywhere" or "just use
auto-increment everywhere" decision — it is a per-table rule
(surrogate id always; uuid when externally addressable) applied
uniformly.

## 5. Foreign Key Strategy

- Every FK column is `BIGINT UNSIGNED`, matching the referenced `id`.
- **`ON DELETE` is chosen per relationship, never defaulted to CASCADE:**
  - `users.id ← user_roles.user_id`: **CASCADE** — a pure relational
    join; if a user row is truly destroyed, its role assignments should
    go with it.
  - `roles.id ← user_roles.role_id`: **CASCADE** — same reasoning.
  - `roles.id ← role_permissions.role_id` and
    `permissions.id ← role_permissions.permission_id`: **CASCADE** — same
    reasoning; `role_permissions` is a pure join table like `user_roles`.
  - `users.id ← refresh_tokens.user_id` and
    `users.id ← email_verification_tokens.user_id`: **CASCADE** — these
    are per-user security artifacts, not institutional entities; if a
    user row is truly destroyed, its tokens are meaningless and should
    go with it.
  - `universities.id ← faculties/departments/programs.university_id`:
    **RESTRICT** — a university must never be able to take its entire
    academic hierarchy down with it via a careless hard delete. Removing
    a university is expected to go through soft-delete (see §6), not a
    real `DELETE`.
  - `faculties.id ← departments/programs.faculty_id`: **SET NULL** —
    `faculty_id` is already optional on both tables (see §7), so losing
    the faculty just clears the reference instead of blocking or
    cascading.
  - `departments.id ← programs.department_id`: **RESTRICT** —
    `department_id` is required on `programs`; a department with
    programs attached cannot be silently removed.
  - `universities.id ← university_domains.university_id` and
    `universities.id ← university_memberships.university_id` (Chunk 04):
    **RESTRICT** — same reasoning as faculties/departments/programs
    above; a university's registered domains and memberships must not be
    able to vanish via a careless hard delete of the university row.
  - `users.id ← university_memberships.user_id` (Chunk 04): **CASCADE** —
    a per-user artifact like `refresh_tokens`/`user_roles`; if a user row
    is truly destroyed, their institutional memberships are meaningless
    and should go with it.
  - `users.id ← audit_logs.actor_user_id` and
    `universities.id ← audit_logs.university_id` (Chunk 04): **SET
    NULL** — `audit_logs` is an append-only historical record; removing
    the actor or the university it concerns must not delete the audit
    entry itself, only null out the now-dangling reference. (In practice
    neither actually happens today, since both `users` and
    `universities` are soft-deleted, never hard-deleted — this is the
    defined behavior if a hard delete were ever performed directly
    against the database.)
- `ON UPDATE CASCADE` everywhere, since the referenced key is a
  surrogate integer that only changes if a row is genuinely re-keyed
  (which shouldn't happen), and CASCADE-on-update is safe/free in that
  case.
- Cross-row invariants a single FK cannot express — e.g. "if
  `departments.faculty_id` is set, that faculty must belong to the same
  `departments.university_id`" — are **service-layer validation**, not a
  DB constraint or a Sequelize model hook. No CRUD API exists yet for
  these tables (out of scope for this chunk), so this is documented here
  for whoever builds that service.

## 6. Soft-Delete Strategy

- **Paranoid (`deleted_at`, Sequelize `paranoid: true`):** `users`,
  `universities`, `faculties`, `departments`, `programs`, plus
  `university_domains` and `university_memberships` (Chunk 04). These are
  the entities described in the brief as "major institutional entities"
  (or, for `users`, an entity whose removal has real downstream
  consequences — role assignments, future profiles, etc.). Soft-delete is
  the normal "remove this" path; a real `DELETE` is blocked by RESTRICT
  wherever it would orphan children (see §5). Notably, **there is no hard
  deletion endpoint anywhere in the Chunk 04 university-management API at
  all** — a university's terminal state is the `DEACTIVATED` status, not
  a `DELETE` request (see `university-management.md` §3).
- **Hard-delete (no `deleted_at`):** `roles`, `user_roles`,
  `permissions`, `role_permissions`. Reference data and pure join rows
  don't carry the same "we might need to restore this" requirement —
  removing a role assignment is just removing a fact, not retiring an
  entity.
- **State tracked by a dedicated column, not soft-delete:**
  `refresh_tokens` (`revoked_at`) and `email_verification_tokens`
  (`used_at`). A token's "no longer valid" state is meaningfully
  different from "deleted" — a revoked/used token's history stays
  inspectable (when was it issued, when was it revoked/used) rather than
  disappearing from view the way `deleted_at` would hide it.
- **Never deleted at all:** `audit_logs` (Chunk 04). Not paranoid, no
  `deleted_at` column — an audit trail that could itself be deleted (soft
  or hard) would defeat its purpose. Rows accumulate indefinitely; a
  future retention/archival job is a separate concern from this chunk.

## 7. Audit Columns

- **Always:** `created_at`, `updated_at` on every table (Sequelize's
  default timestamps, mapped to snake_case).
- **`created_by` / `updated_by`: still intentionally NOT added to any
  table, even now that an authenticated actor exists (`req.user`, since
  Chunk 03).** Chunk 04 needed change attribution for institutional
  entities and chose a **separate `audit_logs` table**
  (`actor_user_id`, `action`, `entity_type`, `entity_id`, `university_id`,
  `metadata` — see `university-management.md` §12) over adding
  `created_by`/`updated_by` columns directly to `universities`/
  `faculties`/etc. A dedicated audit table captures a *history* of who
  changed what and when (every status change, not just the most recent
  one) rather than only the single most recent actor, and keeps
  attribution as an additive, optional concern instead of a column on
  every table that needs it. Per-row `created_by`/`updated_by` columns
  remain a reasonable alternative for a future table that specifically
  needs "who currently owns this row" rather than a change history.
- **`deleted_at`:** see §6 — only on paranoid tables.

## 8. Indexing Strategy

Indexes are added for known access patterns, not by default on every
column:

- **Unique lookups:** `users.email`, `users.uuid`, `universities.slug`,
  `universities.uuid`, `faculties.uuid`, `departments.uuid`,
  `programs.uuid`, `roles.name`, `permissions.name`,
  `refresh_tokens.token_hash`, `email_verification_tokens.token_hash`,
  `university_domains.uuid`, `university_domains.domain` (globally
  unique — see `university-management.md` §6),
  `university_memberships.uuid` — each is how that row is looked up by a
  single value (login by email, entity by public identifier,
  role/permission by name, a token by its hash, a domain by its
  hostname).
- **Foreign keys:** `faculties.university_id`,
  `departments.university_id`, `departments.faculty_id`,
  `programs.university_id`, `programs.department_id`,
  `role_permissions.permission_id`, `refresh_tokens.user_id`,
  `email_verification_tokens.user_id`,
  `university_domains.university_id`,
  `university_memberships.university_id`, `audit_logs.university_id`,
  `audit_logs.actor_user_id` — every FK used in a "give me all X for this
  Y" query (all faculties for a university, all of a user's refresh
  tokens, ...).
- **Composite unique:** `university_memberships (user_id, university_id,
  membership_type)` — a user can hold at most one membership of a given
  type at a given university (e.g. one `STUDENT` membership and, later,
  a separate `ADMIN` membership at the same institution, but never two
  `STUDENT` rows for the same user/university pair).
- **Filter columns:** `users.status`, `universities.status`,
  `universities.country`, `universities.city`, `programs.degree_level`,
  `universities.verification_status`, `university_memberships.status` —
  fields the brief specifically calls out as filter/search dimensions
  (e.g. "universities in this country", "bachelor's programs",
  "pending-verification universities").
- **Audit queries:** `audit_logs (entity_type, entity_id)` (composite —
  "show me the history of this specific row") and
  `audit_logs.created_at` (chronological listing/pruning).
- **Cleanup queries:** `refresh_tokens.expires_at` and
  `email_verification_tokens.expires_at` — anticipated for a future
  background job (`DELETE ... WHERE expires_at < NOW()`); indexed now
  since that access pattern is already designed for, even though the job
  itself isn't built in this chunk.
- **Not indexed:** free-text fields (`description`), rarely-filtered
  optional contact fields (`phone`, `website_url`), and anything without
  a concrete query driving it. An index that isn't used still costs
  writes and storage — it is added when a query needs it, not
  preemptively.

## 9. Multi-Tenancy Strategy

Academic Connect is **shared-database, shared-schema** multi-tenancy: one
MySQL database, one set of tables, with `university_id` as a logical
tenant boundary on the institution hierarchy — not physically isolated
per-university databases or schemas.

This is deliberate, not a shortcut: the product's core value is
**cross-university discovery** (a student at University A must be
discoverable by, and able to connect with, a researcher at University
B). Per-tenant database isolation would make that a cross-database
query/federation problem for what should be the platform's single most
common access pattern. `users` is *not* scoped to a university via a
column on `users` itself — a user's university affiliation(s) are
expressed through `university_memberships` (Chunk 04, a proper table
supporting *multiple* affiliations per user, superseding the "future
profile tables" placeholder this section originally pointed to), keeping
core identity itself tenant-agnostic while still letting a user belong to
several institutions.

`university_id` foreign keys on `faculties`, `departments`, `programs`,
`university_domains`, and `university_memberships` give per-university
scoping wherever it's actually needed (e.g. "show me this university's
departments"), while every table stays in the same schema and is
trivially joinable across the whole platform. Chunk 04's
`assertUniversityAccess` service
(`server/src/modules/university/access.service.js`) is where this logical
boundary is actually *enforced* for mutating requests — see
[`university-management.md`](./university-management.md) §8. Reads of
universities/faculties/departments/programs remain intentionally public
(no tenant check at all) to preserve cross-university discoverability;
only mutations and membership/domain reads are university-scoped.

## 10. Transaction Strategy

No multi-statement write flows exist yet in this chunk (no CRUD APIs are
implemented — see scope note below). The standing rule for when they
land: any service-layer operation that writes to more than one table
(e.g. creating a user and their initial role assignment together) must
wrap those writes in a single Sequelize `sequelize.transaction()`, so a
failure partway through leaves no orphaned rows. Read-only endpoints
don't need one.

## 11. Database Security

- `password_hash` is excluded from `User`'s default Sequelize scope
  (`server/src/models/user.model.js`), so it can never leak through an
  accidental `res.json(user)`. Code that genuinely needs it (the future
  auth module, for comparing a login attempt) must opt in explicitly via
  `User.unscoped()`.
- Database credentials live only in environment variables
  (`server/src/config/env.js`); nothing reads `process.env` directly
  outside that file, and no credential is ever logged (the connection
  log line prints host/port/database name, never the password).
- The health endpoint (`/api/health`) never surfaces the underlying
  connection error — `isDatabaseHealthy()`
  (`server/src/config/database.js`) catches it, logs a message server-side,
  and returns a plain boolean to the caller.
- All queries go through Sequelize's parameterized query builder — no
  raw string-concatenated SQL exists anywhere in this codebase, which is
  the primary SQL-injection defense.
- `DB_ENCRYPT=true` enables TLS (`ssl: { require: true, rejectUnauthorized:
  true }`) for the MySQL connection, for environments (e.g. managed cloud
  MySQL) that require it.

### Token Hashing: SHA-256, Not bcrypt

`refresh_tokens.token_hash` and `email_verification_tokens.token_hash`
store a SHA-256 hex digest, not a bcrypt hash — a deliberate,
different choice from `users.password_hash`, for two reasons:

1. **Lookup requirement.** A refresh/verification token is validated by
   an exact-match database query (`WHERE token_hash = ?`). bcrypt
   generates a random salt per call, so hashing the same input twice
   produces two different outputs — it is architecturally incapable of
   being looked up by equality. SHA-256 is deterministic, so the same
   raw token always hashes to the same value.
2. **Threat model.** bcrypt's slow, salted design defends against
   offline brute-forcing of a *low-entropy, human-chosen* secret (a
   password). These tokens are the opposite: 256 bits of
   `crypto.randomBytes` server-generated randomness. Brute-forcing a
   256-bit random value is infeasible regardless of hash speed, so
   bcrypt's slowness buys nothing here — it would only add unnecessary
   CPU cost to every login/refresh/verify request.

Both columns are also excluded from their models' default Sequelize
scope, as defense-in-depth (see `server/src/models/refresh-token.model.js`
and `email-verification-token.model.js`) — no endpoint ever returns one
of these rows at all, but an accidental future `res.json()` of one still
couldn't leak the hash.

## 12. Production Migration Strategy

**Sequelize's `sync()` (`force` or `alter`) is never called anywhere in
this codebase**, in any environment. Automatic sync would let application
startup silently reshape (or destroy) a production schema — exactly what
this project avoids.

Instead:

- [`/database/schema.sql`](../database/schema.sql) is the current,
  hand-written, reviewable DDL for every table built so far, kept
  up to date as the fresh-install source of truth. A developer (or a
  deploy step) runs it explicitly against a database they control — see
  [`/database/README.md`](../database/README.md).
- This is a **development-phase** mechanism, appropriate while the
  schema is still being deliberately designed chunk by chunk. Before
  this project has real production data to protect, it should be
  replaced with a proper migration tool (Sequelize CLI migrations, or
  `umzug`) that tracks applied migrations in a table and supports
  incremental `ALTER TABLE` changes.
- **Chunk 04 is the first chunk that actually needed to alter an
  existing table** (`universities.verification_status`, added to a table
  that already held Chunk 02/03 data), which is exactly the trigger this
  section flagged in advance. Rather than adopting a full migration
  framework for one column, a `database/migrations/` folder was
  introduced: [`001_chunk04_institution_management.sql`](../database/migrations/001_chunk04_institution_management.sql)
  contains the `ALTER TABLE` plus the three new `CREATE TABLE IF NOT
  EXISTS` statements, for upgrading a database that already ran Chunk
  02/03's `schema.sql`. `schema.sql` itself was also updated in place
  (its `CREATE TABLE universities` now includes the column directly) so
  a **fresh** install never needs to run the migration at all — see
  [`/database/README.md`](../database/README.md) for both paths. This
  numbered-migrations folder is the natural landing place for the "proper
  migration tool" called for above, whenever the project adopts one.

## 13. Backup Considerations

Not implemented in this chunk (no production deployment exists yet).
For when it does: MySQL 8 native logical backups (`mysqldump` /
`mysqlpump`) or a managed provider's automated snapshot feature are both
reasonable starting points; whichever is chosen should be verified with
an actual restore drill, not just "the backup file exists." Point-in-time
recovery (binlog-based) becomes worth setting up once the platform holds
data users would notice losing.

## 14. Connection Pooling

Configured in `server/src/config/database.js` via Sequelize's `pool`
option, sourced from environment variables (all optional, with sensible
defaults):

| Variable          | Default | Meaning                                   |
|-------------------|---------|--------------------------------------------|
| `DB_POOL_MAX`     | 10      | Max simultaneous connections                |
| `DB_POOL_MIN`     | 0       | Min connections kept open when idle         |
| `DB_POOL_ACQUIRE` | 30000ms | Max time to wait for a connection           |
| `DB_POOL_IDLE`    | 10000ms | Max time a connection can sit idle          |

A fixed `connectTimeout: 10000` (ms) is also set on the underlying
`mysql2` connection so a completely unreachable host fails fast instead
of hanging. Timestamps are read/written in UTC
(`timezone: '+00:00'`) regardless of the host machine's or MySQL
server's local timezone, so `created_at`/`updated_at` values are
consistent across environments.

## 15. Future Schema Domains

Chunk 03 implemented the RBAC domain (`permissions`, `role_permissions`)
and auth token storage (`refresh_tokens`, `email_verification_tokens`);
Chunk 04 implemented `university_domains`, `university_memberships`, and
`audit_logs` (see [`authentication.md`](./authentication.md),
[`university-management.md`](./university-management.md), and
[`database-erd.md`](./database-erd.md)). Everything below is still
documented only — **none of these tables exist yet**, and none are
created as empty placeholders. Each will be designed deliberately in the
chunk that actually needs it, following the same conventions above.

- **Academic:** `students` (student profile), `faculty_profiles`,
  `researchers`, `courses`, `skills`, `interests`, `research_areas`,
  `publications`
- **Network:** `connections`, `connection_requests`, `follows`, `blocks`
- **Collaboration:** `projects`, `project_members`, `research_projects`,
  `research_applications`, `mentorships`
- **Communication:** `conversations`, `conversation_members`,
  `messages`, `notifications`
- **Events:** `events`, `event_registrations`
- **Opportunities:** `opportunities`, `opportunity_applications`
- **Administration:** `reports`, `moderation_cases` (`audit_logs` itself
  is now implemented — see §6 above and `university-management.md` §12)

## Testing Against MySQL

Unit tests for model structure and associations
(`server/tests/models/*.test.js`) never require a live database — they
inspect `rawAttributes`/`associations` on models constructed in memory.

`server/tests/database.connection.test.js` is the one test that touches
a real server: it attempts `sequelize.authenticate()` and, if no
database is reachable, logs a warning and passes trivially rather than
failing the whole suite. To exercise that assertion for real, point the
usual `DB_*` variables at a disposable database (never your production
one), e.g.:

```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=academic_connect_test
DB_USER=ac_app
DB_PASSWORD=<local-dev-password>
```

Apply `database/schema.sql` to that test database the same way as any
other before running `npm test` against it.

The Chunk 03 auth integration tests (`server/tests/auth/*.test.js`)
follow the same graceful-skip pattern via a shared helper
(`server/tests/helpers/testDb.js`) — they register real users, log in,
and exercise real tokens against the database, so (unlike the model
structure tests) they need one to run for real. That helper also seeds
the initial roles/permissions/role_permissions catalog directly (mirroring
`database/seed_rbac.sql`), so these tests never depend on that script
having been run separately against the test database.

The Chunk 04 university-management integration tests
(`server/tests/university/*.test.js`) follow the same pattern, via
`testDb.js`'s `resetInstitutionTables()` (clears `audit_logs`,
`university_memberships`, `university_domains`, `programs`,
`departments`, `faculties`, `universities` in FK-safe order between
tests) and a dedicated fixture helper,
`server/tests/helpers/institutionFixtures.js` (`createSuperAdmin`,
`createUniversity`, `createUniversityAdmin` — the latter creates both the
`UNIVERSITY_ADMIN` role assignment *and* the matching `ACTIVE` `ADMIN`
membership together, since `assertUniversityAccess` requires both). Also
skips gracefully with no database reachable, per the same convention.
