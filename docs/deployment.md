# Deployment

Three routes, easiest first. All of them need the same two things: a
PostgreSQL database and a `JWT_SECRET`.

---

## Before you deploy: generate a secret

```bash
openssl rand -hex 32
```

Never reuse the development value. Anyone holding `JWT_SECRET` can mint a
valid admin token for your system.

---

## Option A — Docker Compose (one VPS, everything included)

This is the shortest path if you have a machine with Docker. It brings up
PostgreSQL, the API, and nginx serving the built frontend.

```bash
# on the server
git clone <your-repo> && cd cafe-management-system

export JWT_SECRET="$(openssl rand -hex 32)"
export POSTGRES_PASSWORD="$(openssl rand -hex 16)"

docker compose up --build -d
```

Then load the catalogue once:

```bash
docker compose exec server npx tsx prisma/seed.ts
```

- Frontend: `http://your-server:5173`
- API: `http://your-server:3001`

`docker-compose.yml` deliberately gives `JWT_SECRET` no default — compose
fails fast rather than starting with a known secret.

The server container runs `prisma migrate deploy` on boot, so the schema is
created before it accepts traffic. Postgres has a healthcheck and the server
waits for it.

---

## Option B — Managed platform (Render, Railway, Fly.io)

Good if you would rather not run a server. Deploy as **two services**.

**Database:** create a managed PostgreSQL instance and copy its connection
string.

**API service**
- Root directory: repository root
- Build: `npm install && npm run build --workspace=server`
- Start: `npm run db:migrate:prod --workspace=server && npm start`
- Environment:
  ```
  DATABASE_URL=<from your managed database>
  JWT_SECRET=<the value you generated>
  NODE_ENV=production
  PORT=3001
  CLIENT_URL=https://your-frontend-domain
  ```

**Frontend service** (static site)
- Build: `npm install && npm run build --workspace=client`
- Publish directory: `client/dist`
- Add a rewrite so client-side routing works:
  `/*  →  /index.html` (200)
- Add a proxy so the API stays same-origin:
  `/api/*  →  https://your-api-domain/api/:splat`

The API proxy matters. The frontend calls `/api` as a relative path, so if it
is not proxied you will get CORS failures and cookies will not be sent.

---

## Option C — Plain VPS (no Docker)

```bash
# 1. install Node 20 and PostgreSQL 14+, then:
sudo -u postgres createdb cafe_management

# 2. get the code and build
git clone <your-repo> && cd cafe-management-system
npm install
npm run build

# 3. configure
cp .env.example server/.env
nano server/.env      # set DATABASE_URL, JWT_SECRET, NODE_ENV=production

# 4. create the schema and load data
npm run db:migrate:prod --workspace=server
npm run db:seed

# 5. run the API under a process manager so it survives reboots
npm install -g pm2
pm2 start server/dist/index.js --name cafe-api
pm2 startup && pm2 save
```

Then serve the frontend with nginx. `client/nginx.conf` is a working config —
copy it to `/etc/nginx/sites-available/cafe`, point `root` at
`/path/to/cafe-management-system/client/dist`, and change `proxy_pass` from
`http://server:3001` to `http://127.0.0.1:3001`.

```bash
sudo ln -s /etc/nginx/sites-available/cafe /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Finally add HTTPS:

```bash
sudo certbot --nginx -d your-domain.com
```

---

## After any deploy

**Change the seeded passwords.** `npm run db:seed` creates
`admin@cafe.com / admin123` and two others. They are documented in this
repository, so they are public knowledge. Sign in as admin, then either change
the password or create your own admin and delete the seeded one.

**Do not re-run the seed on a live database.** It truncates every table it owns
before inserting. It is for first load and for development only.

---

## Updating a running deployment

```bash
git pull
npm install
npm run build
npm run db:migrate:prod --workspace=server   # only if the schema changed
pm2 restart cafe-api                          # or: docker compose up -d --build
```

---

## Schema changes

The migration history lives in `server/prisma/migrations`. When you change
`schema.prisma`:

```bash
npm run db:migrate --workspace=server    # development: creates the migration
```

Commit the generated folder. In production, `db:migrate:prod` applies it.

Never run `prisma db push` against production — it alters the schema with no
migration record, and the next deploy will not know what happened.

---

## Troubleshooting

**`node dist/index.js` exits with MODULE_NOT_FOUND**
The server was not compiled. Run `npm run build --workspace=server` and check
that `server/dist/index.js` exists. `server/tsconfig.json` must keep
`"noEmit": false` — the root config sets `noEmit: true` for editor use, and
without the override `tsc` type-checks and emits nothing while still exiting 0.

**Frontend loads but every API call 404s**
The `/api` proxy is missing. See the rewrite rules in Option B, or the
`location /api/` block in `client/nginx.conf`.

**Refreshing a page gives 404**
The SPA fallback is missing. Unknown paths must serve `index.html`.

**`P3005: the database schema is not empty`**
The database predates the migration history. Baseline it once:
`cd server && npx prisma migrate resolve --applied 0_init`

**`Could not determine the connector from the migrations directory`**
`server/prisma/migrations/migration_lock.toml` is missing. It must be
committed — it records that these migrations target PostgreSQL.

**Login works locally but not in production**
`CLIENT_URL` must match the frontend origin exactly, including scheme and
port; it drives the CORS allow-list. Cookies are `secure` over HTTPS, so the
site must be served over TLS.
