# NDS Sales CRM

Sales Pipeline CRM untuk sektor **Banking · Multifinance · Insurance**.
Dibangun dengan **Next.js 16** + **Supabase** + **Tailwind CSS v4**.

## Fitur

| Modul | Keterangan |
|---|---|
| Dashboard | KPI cards (pipeline aktif, weighted value, closed-won), upcoming visits, follow-up list |
| Calendar Visit | Kalender bulanan + tabel semua visit |
| Client | Kartu client dengan tracking kunjungan per ISO-minggu |
| Pipeline | Kanban board drag-and-drop (Lead → Discovery → Proposal → Negotiation → Won) |
| Project | Tabel project dengan status go-live |

---

## Setup Lokal

### 1. Clone & install

```bash
git clone https://github.com/dennychrisst-tech/crmsalesnds.git
cd crmsalesnds
npm install
```

### 2. Buat project Supabase

1. Buka [supabase.com](https://supabase.com) → **New project**
2. Salin **Project URL** dan **anon public key** dari **Settings → API**

### 3. Jalankan migrasi database

Di **Supabase Dashboard → SQL Editor**, jalankan isi file:

```
supabase/migrations/001_init.sql
```

File ini membuat tabel `clients`, `visits`, `deals`, `projects` beserta index dan RLS policy.

### 4. Buat file `.env.local`

```bash
cp .env.local.example .env.local
```

Isi dengan nilai dari Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

---

## Deploy ke Vercel

### Cara 1 — Vercel + Supabase Integration (Recommended)

Cara termudah: hubungkan langsung via integrasi resmi Supabase ↔ Vercel.
Env vars akan diisi otomatis tanpa perlu copy-paste manual.

1. **Import project ke Vercel**
   - Buka [vercel.com/new](https://vercel.com/new)
   - Pilih repo `dennychrisst-tech/crmsalesnds`
   - Framework: **Next.js** (auto-detect)
   - Klik **Deploy** (akan gagal karena env vars belum ada — itu normal)

2. **Hubungkan Supabase**
   - Di dashboard Vercel, buka project → **Storage → Connect Store**
   - Pilih **Supabase** → ikuti wizard
   - Atau langsung dari Supabase Dashboard → **Project Settings → Integrations → Vercel**
   - Integrasi ini otomatis menambahkan:
     ```
     NEXT_PUBLIC_SUPABASE_URL
     NEXT_PUBLIC_SUPABASE_ANON_KEY
     SUPABASE_SERVICE_ROLE_KEY
     SUPABASE_JWT_SECRET
     ```

3. **Redeploy**
   - Vercel → project → **Deployments** → titik tiga → **Redeploy**
   - Atau push commit baru ke `main`

4. **Jalankan migrasi** (jika belum)
   - Supabase Dashboard → **SQL Editor** → jalankan `supabase/migrations/001_init.sql`

### Cara 2 — Manual (tanpa integrasi)

1. Import repo ke Vercel (sama seperti atas)
2. Sebelum deploy, buka **Settings → Environment Variables** di Vercel
3. Tambahkan dua variabel:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase Anda |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase |

4. Pastikan scope: **Production**, **Preview**, **Development**
5. **Save** → **Redeploy**

---

## Struktur Project

```
├── app/
│   ├── globals.css          # Design system (CSS custom properties)
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── CRMApp.tsx           # Root — tab navigation + state wiring
│   ├── Dashboard.tsx
│   ├── CalendarView.tsx
│   ├── Clients.tsx
│   ├── Pipeline.tsx         # Kanban drag-and-drop (@dnd-kit)
│   ├── Projects.tsx
│   ├── VisitModal.tsx
│   ├── ClientModal.tsx
│   ├── DealModal.tsx
│   ├── ProjectModal.tsx
│   └── ui/
│       ├── Badge.tsx
│       └── Modal.tsx
├── hooks/
│   └── useData.ts           # Semua Supabase CRUD
├── lib/
│   ├── supabase.ts          # Lazy Supabase client
│   └── utils.ts             # Helper: fmtIDR, fmtDate, isoWeekLabel, dll.
├── types/
│   └── index.ts             # TypeScript interfaces
├── supabase/
│   └── migrations/
│       └── 001_init.sql     # Schema + RLS policies
└── .env.local.example
```

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS v4 + custom CSS properties
- **Drag & Drop**: @dnd-kit/core
- **Hosting**: Vercel
- **Language**: TypeScript
