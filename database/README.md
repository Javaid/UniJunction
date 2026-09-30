# Database Initialization

`schema.sql` is the authoritative, deliberately-controlled DDL for a
**fresh** database (see [`docs/database-erd.md`](../docs/database-erd.md)
for the full entity map). The application **never** creates or alters
this schema itself — see
[`docs/database-guidelines.md`](../docs/database-guidelines.md#production-migration-strategy)
for why (`sequelize.sync()` is intentionally not used anywhere).

## Setting up a fresh database

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/schema.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_catalog.sql
```

Substitute the same values you put in `server/.env`. None of these
scripts contain credentials or environment-specific values — you always
supply the connection details on the command line.

`seed_rbac.sql` populates the initial roles/permissions/role_permissions
catalog. This is reference/catalog data the application depends on to
function — registration has no `STUDENT` role to assign, and RBAC has
nothing to check permissions against, without it. It is idempotent
(`ON DUPLICATE KEY UPDATE`), so re-running it is always safe.

`seed_catalog.sql` (Chunk 05) populates the initial skills/interests/
research-areas/languages catalog the Student Academic Profile domain
builds on — see [`docs/student-profiles.md`](../docs/student-profiles.md).
Also idempotent; a student profile can technically be created without it,
but the skill/interest/research-area/language endpoints would have
nothing to list.

`schema.sql` uses `CREATE TABLE IF NOT EXISTS`, so re-running it against
a database that already has these tables is a safe no-op; it does not
alter an existing table's shape.

## Upgrading an existing database (`migrations/`)

If you already have a Chunk 02 or Chunk 03 database (created before
`universities.verification_status` existed), `schema.sql` alone won't
retroactively add it — `CREATE TABLE IF NOT EXISTS` can't alter a table
that already exists with an older shape. Run the migration first:

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> \
  < database/migrations/001_chunk04_institution_management.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> \
  < database/migrations/002_chunk05_student_profiles.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_catalog.sql
```

Migration 001 was the first schema change this project needed since
Chunk 02 — see `docs/database-guidelines.md`, "Production migration
strategy", for why incremental migration files (rather than only editing
`schema.sql`) become necessary at exactly this point. Migration 002
(Chunk 05) adds only new tables (no `ALTER TABLE`), so it's safe to
re-run in full (`CREATE TABLE IF NOT EXISTS`) — unlike 001, it has no
duplicate-column failure mode. Each migration file is numbered and
reflects one chunk's schema change; skip a migration only if you're
certain your database already has its tables (e.g. it was built from a
`schema.sql` newer than that migration).

A **new** database never needs the `migrations/` folder — `schema.sql`
already reflects every migration's end state.

## Requirements

- MySQL 8.0+
- A database already created (`CREATE DATABASE <DB_NAME> CHARACTER SET
  utf8mb4;`) — these scripts only create/alter tables inside it.

## Scope

Only the tables covered so far exist here — through Chunk 05, the
Student Academic Profile domain (student profiles, skills, interests,
research areas, languages, certifications, achievements, goals; see
`docs/student-profiles.md`). Future domains (research, projects,
mentorship, messaging, etc.) are documented, not scaffolded, in
`docs/database-guidelines.md`.
