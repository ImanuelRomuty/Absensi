# Deploy gratis — Neon + Render + Vercel

Stack ini **gratis** (free tier). Saya sudah siapkan kode + config; Anda perlu akun gratis dan tempel URL/secrets.

## Yang sudah disiapkan di repo

| Item | Lokasi |
|------|--------|
| BE cloud-ready | [`BE/`](BE/) — `WEB_ORIGIN`, `pnpm build` / `pnpm release` / `pnpm start` |
| Render Blueprint | [`render.yaml`](render.yaml) |
| Web admin | [`web/`](web/) — login, ringkasan, karyawan, lokasi |
| Vercel SPA | [`web/vercel.json`](web/vercel.json) |

## Checklist akun (sekali saja)

### 1. Neon (database)

1. Daftar di https://neon.tech (gratis, bisa pakai GitHub).
2. Create project → database.
3. Copy **Connection string** (`DATABASE_URL`, mode yang ada `sslmode=require` jika ditawarkan).

### 2. GitHub

1. Push repo `masArif` ke GitHub (Render & Vercel connect dari GitHub).
2. Pastikan folder `BE/` dan `web/` ada di remote.

### 3. Render (API)

1. Daftar di https://render.com.
2. **New** → **Blueprint** (pakai [`render.yaml`](render.yaml)) **atau** New Web Service:
   - Root directory: `BE`
   - Build: `npm install -g pnpm@9.15.0 && pnpm install --frozen-lockfile --prod=false && pnpm build`
   - Start: `pnpm start:prod` (migrate + seed + server)
   - Health check: `/api/v1/health`
3. Environment variables:
   - `DATABASE_URL` = string dari Neon
   - `JWT_ACCESS_SECRET` = random ≥32 karakter (atau biarkan generate)
   - `JWT_REFRESH_SECRET` = random ≥32 karakter
   - `WEB_ORIGIN` = URL Vercel nanti (boleh diisi setelah step 4, lalu redeploy)
   - `NODE_ENV=production`, `HOST=0.0.0.0`
4. Deploy → catat URL, contoh: `https://masarif-be.onrender.com`
5. Tes: buka `https://…/api/v1/health`

**Troubleshooting Render**

- Jangan pakai `corepack enable` (error `EROFS` di Render).
- Pakai `--prod=false` saat install supaya `typescript` / `@types/node` ikut terpasang meski `NODE_ENV=production`.

**Catatan free tier:** service bisa sleep; request pertama setelah idle lambat.

### 4. Vercel (Web admin)

1. Daftar di https://vercel.com.
2. Import repo → set **Root Directory** = `web`.
3. Framework: Vite. Build: `pnpm install && pnpm build`. Output: `dist`.
4. Environment variable:
   - `VITE_API_BASE_URL` = URL Render **tanpa** slash akhir, contoh `https://masarif-be.onrender.com`
5. Deploy → catat URL, contoh: `https://masarif-web.vercel.app`
6. Kembali ke Render → set `WEB_ORIGIN=https://masarif-web.vercel.app` → redeploy BE.

### 5. Login

Seed membuat akun (password semua: `Password123!`):

| Email | Role |
|-------|------|
| hr@masarif.local | HR_ADMIN (cocok untuk admin web) |
| manager@masarif.local | MANAGER |
| superadmin@masarif.local | SUPER_ADMIN |
| ani@masarif.local | EMPLOYEE (tidak untuk admin web) |

Buka URL Vercel → login dengan `hr@masarif.local`.

## Urutan penting

1. Neon `DATABASE_URL`  
2. Deploy Render BE (+ migrate/seed)  
3. Deploy Vercel Web dengan `VITE_API_BASE_URL`  
4. Set `WEB_ORIGIN` di Render ke URL Vercel  

## Local (opsional, untuk develop)

```bash
# Terminal A — BE
cd BE && pnpm db:pg
# Terminal B
cd BE && pnpm db:setup && pnpm dev

# Terminal C — Web
cd web && pnpm dev
```

`web/.env` default: `VITE_API_BASE_URL=http://localhost:3000`
