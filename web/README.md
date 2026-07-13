# masArif Web Admin

React + Vite + TypeScript + TanStack Query. Memakai API di `BE/`.

## Local

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Set `VITE_API_BASE_URL` ke URL API (lokal `http://localhost:3000` atau Render).

## Deploy

Lihat [`../DEPLOY.md`](../DEPLOY.md) (Vercel free tier).

Config SPA: [`vercel.json`](vercel.json).

## Fitur MVP admin

- Login (role `MANAGER` / `HR_ADMIN` / `SUPER_ADMIN`)
- Ringkasan profil
- Daftar karyawan
- Daftar lokasi geofence
