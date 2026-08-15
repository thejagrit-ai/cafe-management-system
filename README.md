# The Coffee Bean Cafe — Management System

A full-stack café order and inventory management system: customer storefront, staff
order console, and admin back office over one PostgreSQL database.

Orders deduct ingredients automatically from per-product recipes, inside the same
database transaction that confirms the order.

---

## Features

### Customer

- Browse the menu with categories, search, filtering and sorting
- Product detail pages with availability
- Cart with quantity management
- Checkout with pickup or delivery, address selection, and payment method
- Order confirmation, order tracking and order history
- Account management

### Staff

- Staff dashboard of incoming and in-progress orders
- Create in-person (dine-in) orders with a table number
- Advance order status through the workflow
- View products and permitted inventory

### Admin

- Dashboard with live sales, order and inventory figures
- Product, category, ingredient, recipe and supplier management
- Inventory with stock adjustments and a full transaction history
- Low-stock alerts
- Order and payment management
- Employee and customer management
- Sales, inventory and product reports
- Business settings (tax rate, delivery fee, out-of-stock policy)

---

## Tech Stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Radix UI primitives,
TanStack Query, React Router, React Hook Form, Zod, Recharts, Lucide icons

**Backend** — Node.js 20, TypeScript, Express 4, Prisma ORM, Zod, Helmet,
express-rate-limit, JWT, bcryptjs

**Database** — PostgreSQL 14+

**Tooling** — ESLint, Prettier, Vitest, Supertest, Docker

---

## Architecture

Requests flow through one direction only, so business rules cannot be bypassed by
calling a layer directly:

```
route  ->  middleware (authenticate, authorize, validate)
       ->  controller (HTTP shape only)
       ->  service    (business rules, transactions)
       ->  repository (Prisma data access)
       ->  PostgreSQL
```

- **Controllers** translate HTTP to service calls. They contain no business logic.
- **Services** own the rules: pricing, stock checks, status transitions, auditing.
  Anything touching more than one table runs inside `prisma.$transaction`.
- **Repositories** wrap Prisma and share pagination through `BaseRepository`.
- **Validators** are Zod schemas applied by the `validate` middleware, which writes
  the parsed result back onto the request so coercion and defaults take effect.

```
cafe-management-system/
├── client/                 # React frontend
│   ├── src/api/            # typed API client per resource
│   ├── src/components/     # shared and shadcn-style UI components
│   ├── src/contexts/       # auth and cart providers
│   ├── src/layouts/        # admin and staff shells
│   ├── src/pages/          # customer / staff / admin / auth routes
│   └── src/utils/          # formatting and helpers
├── server/                 # Express API
│   ├── prisma/             # schema, migrations, seed
│   ├── src/config/         # env config and Prisma client
│   ├── src/controllers/    # HTTP handlers
│   ├── src/middleware/     # auth, validation, error handling
│   ├── src/repositories/   # data access
│   ├── src/routes/         # route tables
│   ├── src/services/       # business logic
│   ├── src/utils/          # errors, responses, hashing, audit
│   ├── src/validators/     # Zod schemas
│   └── tests/              # integration tests
├── docs/                   # additional documentation
├── docker-compose.yml
└── package.json            # npm workspaces root
```

---

## Prerequisites

- Node.js >= 20
- PostgreSQL >= 14 running and reachable
- npm 9+ (workspaces)

---

## Installation

```bash
npm install
```

Create the server environment file:

```bash
cp .env.example server/.env
```

Then edit `server/.env` to match your database.

---

## Environment Variables

All server variables live in `server/.env` (never committed).

| Variable       | Required | Example                                                                     | Purpose                                  |
| -------------- | -------- | --------------------------------------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL` | yes      | `postgresql://postgres:postgres@localhost:5432/cafe_management?schema=public` | PostgreSQL connection string             |
| `JWT_SECRET`   | yes      | a long random string                                                          | Signs access and refresh tokens          |
| `PORT`         | no       | `3001`                                                                        | API port (default 3001)                  |
| `CLIENT_URL`   | no       | `http://localhost:5173`                                                       | Allowed CORS origin                      |
| `NODE_ENV`     | no       | `development`                                                                 | `development`, `production`, or `test`   |

For tests, `TEST_DATABASE_URL` overrides the database. It defaults to
`cafe_management_test` and its name **must** contain `test` — the suite refuses to
run otherwise, because it truncates every table between tests.

---

## Database Setup

Create the database and apply the schema:

```bash
npm run db:migrate          # development: create and apply a migration
npm run db:seed             # load demo data
```

Other commands:

| Command                        | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `npm run db:generate`          | Regenerate the Prisma client after editing the schema        |
| `npm run db:push`              | Push the schema without creating a migration (prototyping)   |
| `npm run db:migrate`           | Create and apply a migration (development)                   |
| `npm run db:seed`              | Reset and reload demo data                                   |
| `npm run db:studio`            | Browse the database in Prisma Studio                         |

In production, apply committed migrations with:

```bash
npm run db:migrate:prod --workspace=server   # prisma migrate deploy
```

**Adopting an existing database:** if the tables already exist, baseline instead of
migrating so Prisma does not try to recreate them:

```bash
cd server
npx prisma migrate resolve --applied 0_init
```

The seed is idempotent — it clears the tables it owns before inserting, so it can be
re-run safely.

---

## Development

```bash
npm run dev            # client and server together
npm run dev:server     # API only,   http://localhost:3001
npm run dev:client     # UI only,    http://localhost:5173
```

Vite proxies `/api` to port 3001, so the browser only ever talks to one origin.

---

## Production Build

```bash
npm run build          # builds both workspaces
npm start              # serves the compiled API
```

### Docker

```bash
export JWT_SECRET="$(openssl rand -hex 32)"
docker compose up --build
```

`JWT_SECRET` has no default on purpose: compose fails fast rather than starting with
a known secret. The client is served by nginx on port 5173 and proxies `/api` to the
server container. The server applies migrations on boot before accepting traffic.

---

## Testing

```bash
npm test                              # all workspaces
npm run test --workspace=server       # server integration tests
npm run test:coverage --workspace=server
```

The server suite is **integration-level**: it drives the real Express app with
Supertest against a real PostgreSQL database, because the interesting failures in
this system are contract mismatches between layers that mocks would hide. Each test
starts from a truncated database and builds only the fixtures it needs.

Coverage spans authentication, authorization, products, orders, inventory and
payments — success and failure paths for each.

---

## API Overview

Responses share one envelope:

```json
{ "success": true, "data": {}, "message": "Operation successful" }
```

Paginated responses add `pagination` with `page`, `limit`, `total`, `totalPages`.
Errors return `{ "success": false, "message": "...", "errors": { "field": ["..."] } }`.

| Route              | Purpose                                              |
| ------------------ | ---------------------------------------------------- |
| `/api/auth`        | register, login, logout, refresh, profile, password   |
| `/api/products`    | menu and product management                           |
| `/api/categories`  | category management                                   |
| `/api/ingredients` | ingredients, stock adjustments, low-stock, history    |
| `/api/recipes`     | recipes and their ingredients                         |
| `/api/orders`      | order creation, listing, status workflow              |
| `/api/payments`    | payment recording and status updates                  |
| `/api/employees`   | staff management                                      |
| `/api/customers`   | customer management and addresses                     |
| `/api/suppliers`   | supplier management                                   |
| `/api/reports`     | sales, inventory and product reports                  |
| `/api/dashboard`   | admin and staff dashboard figures                     |
| `/api/settings`    | business settings                                     |
| `/api/health`      | liveness probe                                        |

---

## User Roles

Roles are `ADMIN`, `STAFF` and `CUSTOMER` — the same three values in the database
enum, the API and the frontend.

| Capability                      | Admin | Staff | Customer |
| ------------------------------- | :---: | :---: | :------: |
| Browse menu, place orders       |   ✓   |   ✓   |    ✓     |
| View own orders                 |   ✓   |   ✓   |    ✓     |
| Create dine-in orders           |   ✓   |   ✓   |          |
| Advance order status            |   ✓   |   ✓   |          |
| Record payments                 |   ✓   |   ✓   |          |
| Adjust inventory                |   ✓   |   ✓   |          |
| Manage catalog and recipes      |   ✓   |       |          |
| Manage staff and customers      |   ✓   |       |          |
| Update payment status / refund  |   ✓   |       |          |
| Reports and business settings   |   ✓   |       |          |

Every rule is enforced server-side by `authorize(...)`; the frontend only hides what
the API would refuse anyway.

---

## Default Development Accounts

Created by `npm run db:seed`. Development only.

| Role     | Email               | Password      |
| -------- | ------------------- | ------------- |
| Admin    | admin@cafe.com      | `admin123`    |
| Staff    | staff@cafe.com      | `staff123`    |
| Customer | customer@cafe.com   | `customer123` |

---

## Troubleshooting

**`Can't reach database server at localhost:5432`**
PostgreSQL is not running or `DATABASE_URL` is wrong. On Windows check the service:
`Get-Service *postgres*`.

**`Authentication failed against database server`**
The user or password in `DATABASE_URL` is wrong. Verify with
`psql -U postgres -h localhost -d postgres -c "SELECT 1"`.

**`EPERM: operation not permitted ... query_engine-windows.dll.node`**
A running Node process is holding the Prisma engine. Stop the dev server (and any
stray `node` processes) and re-run `npm run db:generate`.

**`Error: P3005 — the database schema is not empty`**
The database predates the migration history. Baseline it:
`npx prisma migrate resolve --applied 0_init` from `server/`.

**Tests abort with "Refusing to run tests against database ..."**
`TEST_DATABASE_URL` points at a database whose name does not contain `test`. This
guard exists because the suite truncates every table.

**`EADDRINUSE :::3001`**
Another server is already bound. Find and stop it:
`Get-NetTCPConnection -LocalPort 3001 -State Listen`.

**Port 5173 loads but every API call 404s**
The API is not running, or `npm run dev:client` was started alone. Use `npm run dev`.

---

## License

MIT
