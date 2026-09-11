# 🚀 100% Free Full-Stack Deployment Guide

This guide explains how to deploy your **Cafe Management System** (Database + Backend API + Frontend) to the cloud **100% free of charge**.

---

## 🌟 Method 1: 1-Click Blueprint with Render.com (Recommended & Easiest)

Render gives you:
- **Free Managed PostgreSQL Database**
- **Free Node.js Web Service (Backend Express API)**
- **Free Static Web App (Frontend React + Vite)**

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
1. Go to [dashboard.render.com](https://dashboard.render.com/) and sign in with GitHub.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically detect the [render.yaml](file:///c:/Users/mssi/OneDrive/Desktop/cafe%20management%20system/render.yaml) file in your project!
5. Click **Apply**. Render will automatically provision:
   - Your **Free PostgreSQL Database** (`cafe-database`).
   - A single **Web Service** (`cafe-server`) that builds the React client, then
     runs the Express API and serves the built site from the same URL —
     automatically pushing the Prisma schema and seeding on the way.

Your whole app is then live at `https://cafe-server-<suffix>.onrender.com`; the
frontend and the API share one origin, so nothing else needs configuring.

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
