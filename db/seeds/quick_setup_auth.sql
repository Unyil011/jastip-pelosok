-- ==============================================================================
-- PANDUAN AKUN & PERBAIKAN AUTH SUPABASE (JASTIP PELOSOK)
-- ==============================================================================
-- PENTING:
-- Di versi Supabase GoTrue modern, melakukan INSERT manual langsung ke `auth.users`
-- menyebabkan skema internal auth korup (Error: 500 Database error querying schema).
-- 
-- Akun resmi yang dibuat lewat API resmi Supabase Auth dan SUDAH AKTIF:
-- 1. AKUN KURIR:
--    Nomor HP   : 081234567899
--    Kata Sandi : Password123!
--    Role       : kurir (Approved)
--
-- 2. AKUN ADMIN:
--    Email      : admin_utama@jastip.com
--    Kata Sandi : ChangeMe123!
--    Role       : admin (Approved)
-- ==============================================================================

-- JIKA INGIN MEMBERSIHKAN RECORD KORUP DI SQL EDITOR SUPABASE:
-- Jalankan query berikut di Supabase Dashboard -> SQL Editor:

-- 1. Hapus entri auth lama yang korup akibat INSERT SQL manual:
DELETE FROM auth.identities WHERE identity_data->>'email' IN ('admin@jastip.com', '081234567890@jastip.com');
DELETE FROM auth.users WHERE email IN ('admin@jastip.com', '081234567890@jastip.com');

-- 2. Pastikan profil admin utama dan kurir aktif di public.users:
INSERT INTO public.users (id, nama, no_hp, role, status_approval, alamat)
VALUES 
  ('27260dda-7c02-4154-b7e1-bbcccc92edef', 'Administrator Utama', '081122334455', 'admin', 'approved', 'Kantor Pusat Jastip Pelosok'),
  ('af4a4f83-359b-43e8-96c2-aff60b2ee22f', 'Kurir Pelosok Demo', '081234567899', 'kurir', 'approved', 'Desa Naringgul')
ON CONFLICT (id) DO UPDATE SET
  status_approval = 'approved';

-- 3. Pastikan enum status retur terdaftar
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';
