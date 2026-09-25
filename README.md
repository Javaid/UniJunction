# Academic Connect

A multi-university academic networking and collaboration platform,
connecting students, faculty, researchers, universities, projects, and
opportunities across institutional boundaries.

This repository is a monorepo:

```
/client   React + Vite frontend (JavaScript, Redux Toolkit, Tailwind CSS)
/server   Node.js + Express backend (JavaScript, Sequelize, MySQL)
/docs     Architecture and development documentation
```

See [`docs/architecture.md`](docs/architecture.md) for the system design
and [`docs/development-guidelines.md`](docs/development-guidelines.md)
for coding conventions.

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

### 3. Run the backend

```bash
cd server
npm run dev      # starts on PORT (default 5000), requires MySQL running
```

Verify with: `curl http://localhost:5000/api/health`

### 4. Run the frontend

```bash
cd client
npm run dev       # starts on http://localhost:5173
```

### 5. Run tests

```bash
cd server && npm test
cd client && npm test
```

## Status

This repository currently contains only the **project foundation**
(Chunk 01): application shells, environment/configuration wiring, the
`/api/health` endpoint, and the modular-monolith directory structure.
No product domains (users, universities, research, projects, messaging,
etc.) are implemented yet.
