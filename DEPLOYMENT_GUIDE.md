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
   - Your **Backend API** (`cafe-server`), automatically running Prisma migrations and seeding.
   - Your **Frontend Website** (`cafe-client`).

---

## ⚡ Method 2: Vercel (Frontend) + Neon/Supabase (Database) + Render (Backend)

If you prefer using **Vercel** for ultra-fast frontend speeds:

### 1. Free Cloud PostgreSQL (Neon.tech or Supabase)
1. Sign up at [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
2. Create a free project and copy your **Postgres Connection URI** (`postgresql://...`).

### 2. Free Backend on Render
1. Go to [render.com](https://render.com) → **New Web Service**.
2. Connect your GitHub repo, set:
   - **Root Directory:** `server`
   - **Build Command:** `npm install && npm run build && npx prisma db push && npm run db:seed`
   - **Start Command:** `npm start`
3. Add Environment Variables:
   - `DATABASE_URL`: *(Your Postgres Connection String from Neon/Supabase)*
   - `JWT_SECRET`: *(Any secret random string)*
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`

### 3. Free Frontend on Vercel
1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Connect your GitHub repo, set:
   - **Root Directory:** `client`
   - **Framework Preset:** `Vite`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api`
4. Click **Deploy**!

---

## 🔑 Default Seeded Accounts for Production Testing
- **Admin Panel:** `admin@cafe.com` / `admin123`
- **Staff (Baristas & Kitchen KDS):** `staff@cafe.com` / `staff123`
- **Customer:** `customer@cafe.com` / `customer123`
