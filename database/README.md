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
```

Substitute the same values you put in `server/.env`. Neither script
contains credentials or environment-specific values — you always supply
the connection details on the command line.

`seed_rbac.sql` populates the initial roles/permissions/role_permissions
catalog. This is reference/catalog data the application depends on to
function — registration has no `STUDENT` role to assign, and RBAC has
nothing to check permissions against, without it. It is idempotent
(`ON DUPLICATE KEY UPDATE`), so re-running it is always safe.

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
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
```

This is the first schema change this project has needed since Chunk 02 —
see `docs/database-guidelines.md`, "Production migration strategy", for
why incremental migration files (rather than only editing `schema.sql`)
become necessary at exactly this point. Each migration file is numbered
and run once; re-running one is safe for its `CREATE TABLE IF NOT EXISTS`
statements but will error on its `ALTER TABLE` (a duplicate-column error
just means it was already applied).

A **new** database never needs the `migrations/` folder — `schema.sql`
already reflects every migration's end state.

## Requirements

- MySQL 8.0+
- A database already created (`CREATE DATABASE <DB_NAME> CHARACTER SET
  utf8mb4;`) — these scripts only create/alter tables inside it.

## Scope

Only the tables covered so far exist here. Future domains (profiles,
research, projects, messaging, etc.) are documented, not scaffolded, in
`docs/database-guidelines.md`.
