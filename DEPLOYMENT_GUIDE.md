# 🚀 100% Free Full-Stack Deployment Guide

This guide explains how to deploy your **Cafe Management System** (Database + Backend API + Frontend) to the cloud **100% free of charge**.

---

## 🌟 Method 1: 1-Click Blueprint with Render.com (Recommended & Easiest)

One Render web service builds the React client, runs the Express API, and serves
both from a single URL. The frontend and the API share an origin, so there is no
proxy, no CORS setup and no second host that can quietly disappear.

[render.yaml](./render.yaml) declares both the `cafe-database` Postgres instance
and the `cafe-server` web service. Render matches blueprint resources by name,
so applying it against a workspace that already has `cafe-database` adopts that
instance rather than creating a second one — and keeps it blueprint-managed.
`DATABASE_URL` is wired to it automatically via `fromDatabase`; there is nothing
to paste.

### Step 1: Push Your Code to GitHub
1. Create a free repository on [github.com](https://github.com).
2. Push your project code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for live deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
   git push -u origin main
   ```

### Step 2: Deploy on Render
1. Click **New +** → **Blueprint** and connect your GitHub repository.
2. Render detects [render.yaml](./render.yaml). Click **Apply**. It creates (or
   adopts) `cafe-database`, then creates `cafe-server`, which builds the client,
   builds the API, pushes the Prisma schema, seeds it, and starts.

Both resources are pinned to `oregon`. They must share a region — a service in
another region cannot reach the database's internal connection string — so if
you move one, move both.

Your whole app is then live at `https://cafe-server-<suffix>.onrender.com`.
**Copy that URL from the service page rather than typing it.** Render's random
suffix is easy to transpose, and a mistyped hostname returns a plain-text
`Not Found` that looks exactly like a broken backend.

> **Creating the service by hand instead of via Blueprint?** Use **New + → Web
> Service**, leave **Root Directory** empty (the build needs both `client/` and
> `server/`), and copy the `buildCommand` and `startCommand` out of
> [render.yaml](./render.yaml) verbatim. Then add `DATABASE_URL`, `JWT_SECRET`,
> `NODE_ENV=production` and `PORT=10000` as environment variables.

### Step 3: Check it worked
`https://cafe-server-<suffix>.onrender.com/api/health` must return JSON
(`{"success":true,...}`). If it returns HTML, the API did not start and the
SPA fallback is answering; if it returns a plain-text `Not Found`, the service
name in the URL is wrong. Note that a free service sleeps after inactivity, so
the first request after a quiet spell takes ~50 seconds.

---

## ⚡ Method 2: Everything on Vercel (one project, one URL)

The repository root [vercel.json](./vercel.json) deploys the React client **and**
the Express API from a single Vercel project: the SPA is served from the CDN and
every `/api/*` request is rewritten to the serverless function in
[api/index.ts](./api/index.ts). Because both live on the same origin there is no
cross-origin proxy to break and nothing to configure in the client.

### 1. Free Cloud PostgreSQL (Neon.tech or Supabase)
1. Sign up at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Create a free project and copy your **Postgres Connection URI** (`postgresql://...`).

### 2. Deploy the project on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project** and connect the repo.
2. **Root Directory must be the repository root (`./`), not `client`.** With the
   root set to `client`, Vercel never uploads `api/` or `server/`, so every
   `/api/*` call returns 404. (Check this on an existing project under
   **Settings → General → Root Directory**.)
3. Leave the build settings alone — `vercel.json` supplies them.
4. Add Environment Variables:
   - `DATABASE_URL`: *(your Postgres connection string)*
   - `JWT_SECRET`: *(any long random string)*
   - `NODE_ENV`: `production`
   - `VITE_PUBLIC_URL`: `https://your-app.vercel.app` *(baked into the table QR codes)*
5. Deploy, then create the tables once from your machine:
   ```bash
   cd server
   DATABASE_URL="<your connection string>" npx prisma db push
   DATABASE_URL="<your connection string>" npm run db:seed
   ```

### Trade-off to be aware of
Serverless functions cannot hold a connection open indefinitely, so the
Server-Sent Events stream at `/api/events` reconnects every ~30 seconds. Order
and inventory screens still refresh, just not instantly. If live push matters
for your kitchen display, use **Method 1** — a Render web service is a
long-running process and keeps the stream open.

---

## Re-deploying without losing data

The build command runs the seeder on every deploy. `npm run db:seed` detects a
database that already holds users, products or orders and skips it, so live
orders, customers and audit history survive a redeploy untouched. Only set
`SEED_FORCE=true` if you genuinely want to erase everything and start again.

`npm run db:repair-images` runs afterwards and repoints any product or category
still holding a dead remote photo URL at the images bundled with the frontend.
It never overwrites a picture that was uploaded or set by hand.

---

## 🔑 Default Seeded Accounts for Production Testing
- **Admin Panel:** `admin@cafe.com` / `admin123`
- **Staff (Baristas & Kitchen KDS):** `staff@cafe.com` / `staff123`
- **Customer:** `customer@cafe.com` / `customer123`

---

Developed and owned by **Norynt** — [www.norynt.app](https://www.norynt.app)
