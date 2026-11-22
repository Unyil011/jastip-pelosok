-- ==============================================================================
-- SETUP DATABASE UTAMA & IZIN PESANAN CUSTOMER (JASTIP PELOSOK)
-- ==============================================================================
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New Query -> RUN
-- ==============================================================================

-- 1. Matikan RLS agar tabel jalur, desa, dan orders bisa diakses & dipesan
ALTER TABLE public.jalur DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.desa DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Buat kolom jalur_id di orders menjadi opsional (NULLABLE) agar customer bisa order lancar
ALTER TABLE public.orders ALTER COLUMN jalur_id DROP NOT NULL;

-- 3. Masukkan Master Jalur Pengantaran Naringgul
INSERT INTO public.jalur (id, nama_jalur)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Jalur 1 - Naringgul Barat'),
  ('22222222-2222-2222-2222-222222222222', 'Jalur 2 - Naringgul Timur')
ON CONFLICT (id) DO UPDATE SET nama_jalur = EXCLUDED.nama_jalur;

-- 4. Masukkan Master 11 Desa Resmi Naringgul
INSERT INTO public.desa (id, nama_desa, jalur_id)
VALUES 
  ('desa-balegede', 'Balegede', '11111111-1111-1111-1111-111111111111'),
  ('desa-cinerang', 'Cinerang', '11111111-1111-1111-1111-111111111111'),
  ('desa-malati', 'Malati', '11111111-1111-1111-1111-111111111111'),
  ('desa-margasari', 'Margasari', '11111111-1111-1111-1111-111111111111'),
  ('desa-mekarsari', 'Mekarsari', '11111111-1111-1111-1111-111111111111'),
  ('desa-naringgul', 'Naringgul', '11111111-1111-1111-1111-111111111111'),
  ('desa-sukabakti', 'Sukabakti', '22222222-2222-2222-2222-222222222222'),
  ('desa-sukamulya', 'Sukamulya', '22222222-2222-2222-2222-222222222222'),
  ('desa-wanasari', 'Wanasari', '22222222-2222-2222-2222-222222222222'),
  ('desa-wangunjaya', 'Wangunjaya', '22222222-2222-2222-2222-222222222222'),
  ('desa-wangunsari', 'Wangunsari', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO UPDATE SET 
  nama_desa = EXCLUDED.nama_desa,
  jalur_id = EXCLUDED.jalur_id;

-- 5. Pastikan Enum Status Retur Terdaftar
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';

-- 6. Pastikan Akun Admin Tunggal & Kurir Terdaftar Aktif di public.users
INSERT INTO public.users (id, nama, no_hp, role, status_approval, alamat)
VALUES 
  ('aa37eb1d-ff9f-4269-9788-eee0f28e16c6', 'Administrator', '081211112222', 'admin', 'approved', 'Kantor Pusat Jastip Pelosok'),
  ('af4a4f83-359b-43e8-96c2-aff60b2ee22f', 'Kurir Pelosok Demo', '081234567899', 'kurir', 'approved', 'Desa Naringgul')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  status_approval = 'approved';

-- 7. Turunkan role akun lain jika ada admin selain admin1
UPDATE public.users 
SET role = 'customer' 
WHERE role = 'admin' AND id <> 'aa37eb1d-ff9f-4269-9788-eee0f28e16c6';
