-- ==============================================================================
-- SETUP DATABASE UTAMA & IZIN PESANAN CUSTOMER (JASTIP PELOSOK)
-- ==============================================================================
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New Query -> RUN
-- ==============================================================================

-- 1. Matikan RLS agar tabel jalur, desa, orders, dan users bisa dibaca & ditulis lancar
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.desa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jalur DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. HAPUS aturan NOT NULL & Foreign Key kaku pada jalur_id di tabel orders
--    (Agar order customer selalu berhasil masuk tanpa terhalang foreign key)
ALTER TABLE public.orders ALTER COLUMN jalur_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_jalur_id_fkey;

-- 3. Masukkan Master Jalur Pengantaran (UUID Valid)
INSERT INTO public.jalur (id, nama_jalur)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Jalur 1 - Naringgul Barat'),
  ('22222222-2222-2222-2222-222222222222', 'Jalur 2 - Naringgul Timur')
ON CONFLICT (id) DO UPDATE SET nama_jalur = EXCLUDED.nama_jalur;

-- 4. Masukkan Master 11 Desa Resmi Pelosok Naringgul dengan ID UUID otomatis (gen_random_uuid)
INSERT INTO public.desa (id, nama_desa, jalur_id)
VALUES 
  (gen_random_uuid(), 'Balegede', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Cinerang', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Malati', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Margasari', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Mekarsari', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Naringgul', '11111111-1111-1111-1111-111111111111'),
  (gen_random_uuid(), 'Sukabakti', '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), 'Sukamulya', '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), 'Wanasari', '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), 'Wangunjaya', '22222222-2222-2222-2222-222222222222'),
  (gen_random_uuid(), 'Wangunsari', '22222222-2222-2222-2222-222222222222')
ON CONFLICT DO NOTHING;

-- 5. Pastikan Enum Status Retur Terdaftar
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';

-- 6. Pastikan Akun Admin Tunggal & Kurir Terdaftar Aktif di public.users
INSERT INTO public.users (id, nama, no_hp, role, status_approval, alamat)
VALUES 
  ('aa37eb1d-ff9f-4269-9788-eee0f28e16c6', 'Administrator', '081211112222', 'admin', 'approved', 'Kantor Pusat Jastip Pelosok'),
  ('af4a4f83-359b-43e8-96c2-aff60b2ee22f', 'Kurir Pelosok Demo', '081234567899', 'kurir', 'approved', 'Semua Desa')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  status_approval = 'approved';

-- 7. Pastikan hanya ada 1 admin
UPDATE public.users 
SET role = 'customer' 
WHERE role = 'admin' AND id <> 'aa37eb1d-ff9f-4269-9788-eee0f28e16c6';
