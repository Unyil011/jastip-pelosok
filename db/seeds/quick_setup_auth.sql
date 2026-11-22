-- ==============================================================================
-- SKRIP SETUP OTOMATIS: AKUN ADMIN & KURIR + AKTIVASI LOGIN (JASTIP PELOSOK)
-- ==============================================================================
-- Cara pakai:
-- 1. Buka Supabase Dashboard Anda (https://supabase.com/dashboard)
-- 2. Pilih menu "SQL Editor" di bilah samping kiri -> Klik "New query"
-- 3. Tempel (Paste) seluruh skrip di bawah ini, lalu klik tombol "RUN" (hijau)
-- ==============================================================================

-- 1. Aktifkan ekstensi pgcrypto untuk hash password
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Konfirmasi semua email di auth.users agar TIDAK terblokir verifikasi email
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 3. Daftarkan status 'retur' ke delivery_status enum bila belum ada
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';

-- 4. BUAT AKUN ADMIN OTOMATIS
--    Login dengan:
--    Email/HP: admin@jastip.com (atau 080000000000)
--    Password: ChangeMe123!
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@jastip.com';

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@jastip.com',
      crypt('ChangeMe123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"nama":"Administrator"}',
      NOW(), NOW(), 'authenticated', 'authenticated'
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('ChangeMe123!', gen_salt('bf')),
      email_confirmed_at = NOW()
    WHERE id = v_admin_id;
  END IF;

  INSERT INTO public.users (id, nama, no_hp, role, status_approval, alamat)
  VALUES (v_admin_id, 'Administrator', '080000000000', 'admin', 'approved', 'Kantor Hub Naringgul')
  ON CONFLICT (id) DO UPDATE SET
    nama = 'Administrator',
    role = 'admin',
    status_approval = 'approved';
END $$;

-- 5. BUAT AKUN KURIR OTOMATIS
--    Login dengan:
--    No HP: 081234567890
--    Password: Password123!
DO $$
DECLARE
  v_kurir_id uuid;
BEGIN
  SELECT id INTO v_kurir_id FROM auth.users WHERE email = '081234567890@jastip.com';

  IF v_kurir_id IS NULL THEN
    v_kurir_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
    ) VALUES (
      v_kurir_id,
      '00000000-0000-0000-0000-000000000000',
      '081234567890@jastip.com',
      crypt('Password123!', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"nama":"Asep Kurir Pelosok"}',
      NOW(), NOW(), 'authenticated', 'authenticated'
    );
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt('Password123!', gen_salt('bf')),
      email_confirmed_at = NOW()
    WHERE id = v_kurir_id;
  END IF;

  INSERT INTO public.users (id, nama, no_hp, role, status_approval, nomor_dana)
  VALUES (v_kurir_id, 'Asep Kurir Pelosok', '081234567890', 'kurir', 'approved', '081234567890')
  ON CONFLICT (id) DO UPDATE SET
    nama = 'Asep Kurir Pelosok',
    role = 'kurir',
    status_approval = 'approved';
END $$;
