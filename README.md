# Academic Connect

A multi-university academic networking and collaboration platform,
connecting students, faculty, researchers, universities, projects, and
opportunities across institutional boundaries.

This repository is a monorepo:

```
/client     React + Vite frontend (JavaScript, Redux Toolkit, Tailwind CSS)
/server     Node.js + Express backend (JavaScript, Sequelize, MySQL)
/database   Hand-written SQL schema (see database/README.md)
/docs       Architecture and development documentation
```

See [`docs/architecture.md`](docs/architecture.md) for the system design,
[`docs/development-guidelines.md`](docs/development-guidelines.md) for
coding conventions, [`docs/database-guidelines.md`](docs/database-guidelines.md)
+ [`docs/database-erd.md`](docs/database-erd.md) for the database design,
and [`docs/authentication.md`](docs/authentication.md) for the
authentication/authorization model.

## Quick Start

### 1. Configure environment variables

```bash
cp .env.example server/.env
cp .env.example client/.env
```

Edit each file to keep only the variables relevant to that app (see
`.env.example` for which belong to which), and fill in real local values
(especially the MySQL credentials).

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Initialize the database schema

Create the database itself, then apply the schema (the app never alters
its own schema at startup — see `docs/database-guidelines.md`):

```bash
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p -e "CREATE DATABASE IF NOT EXISTS <DB_NAME> CHARACTER SET utf8mb4;"
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/schema.sql
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < database/seed_rbac.sql
```

The seed script populates the initial roles/permissions catalog —
without it, registration has no `STUDENT` role to assign. See
[`database/README.md`](database/README.md).

### 4. Run the backend

```bash
cd server
npm run dev      # starts on PORT (default 5000), requires MySQL running
```

Verify with: `curl http://localhost:5000/api/health` — the response
reports both API and database connectivity.

### 5. Run the frontend

```bash
cd client
npm run dev       # starts on http://localhost:5173
```

### 6. Run tests

```bash
cd server && npm test
cd client && npm test
```

Backend model/structure tests don't need a database. The one MySQL
connection test degrades gracefully (skips its assertion with a warning)
if no database is reachable — see `docs/database-guidelines.md` for
pointing it at a real test database.

## Status

- **Chunk 01:** project foundation — application shells,
  environment/configuration wiring, the `/api/health` endpoint, and the
  modular-monolith directory structure.
- **Chunk 02:** MySQL 8 database foundation — identity (`users`, `roles`,
  `user_roles`) and institution (`universities`, `faculties`,
  `departments`, `programs`) models, associations, and schema.
- **Chunk 03:** Authentication & authorization — registration, email
  verification, login, JWT access tokens, revocable/rotating refresh
  tokens, logout, `/api/auth/me`, RBAC (roles + permissions), and
  admin-only user listing/role-assignment endpoints. Frontend has real
  login/register pages, a Redux `authSlice`, an Axios refresh
  interceptor, and a `ProtectedRoute`-gated dashboard. See
  [`docs/authentication.md`](docs/authentication.md). No later product
  domains (university management, profiles, research, projects,
  messaging, etc.) are implemented yet.
