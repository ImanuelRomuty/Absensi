# masArif Backend (BE)

Production API foundation for the HR system: auth (JWT + refresh), RBAC, employees, and office geofence locations.

## Stack

- Node.js + TypeScript
- Fastify
- Prisma + PostgreSQL
- Zod validation
- pnpm

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL via either:
  - **Embedded Postgres** (no Docker) — recommended on this machine
  - **Docker Compose** — if Docker Desktop is installed

## Quick start

```bash
cd BE
cp .env.example .env

pnpm install

# Terminal A — start Postgres on port 5433
pnpm db:pg

# Terminal B — migrate, seed, run API
pnpm db:setup
pnpm dev
```

API base: `http://localhost:3000/api/v1`

Health check: `GET /api/v1/health`

### Docker alternative

If Docker is available, use port **5432** and update `DATABASE_URL` in `.env` to match `docker-compose.yml`:

```bash
docker compose up -d
# DATABASE_URL=postgresql://masarif:masarif@127.0.0.1:5432/masarif?schema=public
pnpm db:setup
pnpm dev
```

## Seed accounts

Password for all: `Password123!`

| Email | Role |
|-------|------|
| superadmin@masarif.local | SUPER_ADMIN |
| hr@masarif.local | HR_ADMIN |
| manager@masarif.local | MANAGER |
| ani@masarif.local | EMPLOYEE |
| citra@masarif.local | EMPLOYEE |

## Useful scripts

| Script | Description |
|--------|-------------|
| `pnpm db:pg` | Start embedded Postgres (port 5433) |
| `pnpm db:setup` | `migrate deploy` + seed |
| `pnpm dev` | Run API with reload |
| `pnpm prisma:migrate` | Create/apply dev migrations |
| `pnpm prisma:seed` | Seed users/locations |
| `pnpm test:smoke` | Health + login + `/me` smoke tests |
| `pnpm typecheck` | TypeScript check |

## Main endpoints (phase 1)

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET|POST /api/v1/employees`
- `GET|PATCH /api/v1/employees/:id`
- `GET|POST /api/v1/locations`
- `GET|PATCH /api/v1/locations/:id`

Response envelope: `{ "data": ... }` or `{ "error": { "code", "message", "details?" } }`.

## Cloud deploy (free)

See root [`DEPLOY.md`](../DEPLOY.md) for Neon + Render + Vercel.

Production env extras:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `WEB_ORIGIN` | Comma-separated allowed CORS origins (your Vercel URL) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Min 32 chars each |

Scripts:

- `pnpm build` — `prisma generate` + compile
- `pnpm release` — migrate + seed (Render pre-deploy)
- `pnpm start` — run compiled server
- `pnpm start:prod` — migrate then start (alternative single command)
