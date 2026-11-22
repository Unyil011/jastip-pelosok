-- ==============================================================================
-- PANDUAN AKUN & PERBAIKAN AUTH SUPABASE (JASTIP PELOSOK)
-- ==============================================================================
-- 1. AKUN ADMIN TUNGGAL (SATU-SATUNYA ADMIN):
--    Email      : admin1@jastip.com
--    Kata Sandi : Admin111
--    Role       : admin (Approved)
--
-- 2. AKUN KURIR:
--    Nomor HP   : 081234567899
--    Kata Sandi : Password123!
--    Role       : kurir (Approved)
-- ==============================================================================

-- JIKA INGIN MEMASTIKAN TIDAK ADA ADMIN LAIN DI SQL EDITOR SUPABASE:
-- Jalankan query berikut:

-- 1. Turunkan role admin lain menjadi customer jika ada:
UPDATE public.users 
SET role = 'customer' 
WHERE role = 'admin' AND id <> 'aa37eb1d-ff9f-4269-9788-eee0f28e16c6';

-- 2. Pastikan akun admin1@jastip.com adalah admin aktif:
INSERT INTO public.users (id, nama, no_hp, role, status_approval, alamat)
VALUES ('aa37eb1d-ff9f-4269-9788-eee0f28e16c6', 'Administrator', '081211112222', 'admin', 'approved', 'Kantor Pusat Jastip Pelosok')
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  status_approval = 'approved';

-- 3. Pastikan enum status retur terdaftar
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';
