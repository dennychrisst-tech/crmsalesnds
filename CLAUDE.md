@AGENTS.md

# Database Migration Rules

## CRITICAL: Prisma migrations TIDAK berjalan otomatis di Vercel

Build command hanya menjalankan `prisma generate && next build` — BUKAN `prisma migrate deploy`.

**Alasan:** `DATABASE_URL` menggunakan PgBouncer (port 6543) yang tidak mendukung DDL statements.

### Setiap kali menambah tabel atau mengubah schema:

1. Tambahkan model ke `prisma/schema.prisma` (untuk type safety Prisma Client)
2. Tulis SQL-nya secara manual
3. Instruksikan user untuk menjalankan SQL tersebut di **Supabase Dashboard → SQL Editor**
4. Gunakan `CREATE TABLE IF NOT EXISTS` agar idempotent

### Contoh format SQL yang harus diberikan ke user:

```sql
CREATE TABLE IF NOT EXISTS nama_tabel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- kolom lainnya
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabel yang sudah ada di production (sudah dibuat manual):

| Tabel | Dibuat | Keterangan |
|-------|--------|------------|
| `users` | 2026-06-30 | Custom auth — id, name, email, password_hash, role |
| `clients` | Awal project | CRM clients |
| `contacts` | Awal project | PIC per client |
| `visits` | Awal project | Kunjungan ke client |
| `deals` | Awal project | Pipeline deals |
| `projects` | Awal project | Proyek |
| `tasks` | Awal project | Task management |
| `products` | Awal project | Katalog produk |
| `documents` | Awal project | Dokumen per deal |
| `attachments` | Awal project | File upload |
| `activities` | Awal project | Log aktivitas |
| `events` | Awal project | Jadwal event |
| `app_settings` | 2026-06-30 | Key-value pengaturan aplikasi |

### SQL untuk `app_settings` (jalankan jika belum ada):

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO app_settings (key, value) VALUES
  ('company_name', 'PT Nusantara Duta Solusindo'),
  ('currency', 'IDR'),
  ('fiscal_year_start', '01'),
  ('support_email', '')
ON CONFLICT (key) DO NOTHING;
```

---

# Stack & Auth

- **Database:** Supabase PostgreSQL (digunakan sebagai plain PostgreSQL saja — tanpa Supabase Auth)
- **ORM:** Prisma 7 dengan `@prisma/adapter-pg` + `pg` Pool
- **Auth:** Custom JWT (`jose`) + bcrypt, cookie `crm_session` (HTTP-only, 7 hari)
- **File storage:** Supabase Storage bucket `crm-attachments`
- **Deploy:** Vercel — build command: `prisma generate && next build`
- **Middleware:** `proxy.ts` (bukan `middleware.ts`) — protects all non-API routes

## Prisma 7 Breaking Changes (jangan lupa)

- `url` dan `directUrl` TIDAK boleh ada di `datasource db {}` dalam `schema.prisma`
- Konfigurasi koneksi ada di `prisma.config.ts` dan `lib/prisma.ts`
- `lib/prisma.ts` menghapus `sslmode` dan `pgbouncer` dari URL sebelum dikirim ke `pg.Pool`
