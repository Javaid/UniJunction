# Database Initialization

`schema.sql` is the authoritative, deliberately-controlled DDL for the
domains implemented so far (identity + institution — see
[`docs/database-erd.md`](../docs/database-erd.md)). The application
**never** creates or alters this schema itself — see
[`docs/database-guidelines.md`](../docs/database-guidelines.md#production-migration-strategy)
for why (`sequelize.sync()` is intentionally not used anywhere).

## Running it

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/schema.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
```

Substitute the same values you put in `server/.env`. Neither script
contains credentials or environment-specific values — you always supply
the connection details on the command line.

`seed_rbac.sql` populates the initial roles/permissions/role_permissions
catalog (§19–21 of the Chunk 03 brief). This is reference/catalog data
the application depends on to function — registration has no `STUDENT`
role to assign, and RBAC has nothing to check permissions against,
without it. It is idempotent (`ON DUPLICATE KEY UPDATE`), so re-running
it is always safe.

It uses `CREATE TABLE IF NOT EXISTS`, so re-running it against a database
that already has these tables is a safe no-op; it does not alter an
existing table's shape. If the schema needs to change, edit `schema.sql`,
review the diff, and apply it deliberately (drop/recreate in a local dev
database, or a proper `ALTER TABLE` for anything with existing data).

## Requirements

- MySQL 8.0+
- A database already created (`CREATE DATABASE <DB_NAME> CHARACTER SET
  utf8mb4;`) — this script only creates tables inside it.

## Scope

Only the tables covered by the current chunk exist here. Future domains
(profiles, research, projects, messaging, etc.) are documented, not
scaffolded, in `docs/database-guidelines.md`.
