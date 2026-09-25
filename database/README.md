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
```

Substitute the same values you put in `server/.env`. The script contains
no credentials or environment-specific values — you always supply the
connection details on the command line.

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
