-- ==============================================================================
-- SKRIP SETUP OTOMATIS: AKUN ADMIN & KURIR + IDENTITAS AUTH (JASTIP PELOSOK)
-- ==============================================================================
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor -> New Query -> RUN
-- ==============================================================================

-- 1. Aktifkan ekstensi pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Konfirmasi semua email di auth.users agar TIDAK terblokir verifikasi
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- 3. Daftarkan status 'retur' ke delivery_status enum bila belum ada
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';

-- 4. BUAT AKUN ADMIN (admin@jastip.com / ChangeMe123!)
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

-- 5. BUAT AKUN KURIR (081234567890 / Password123!)
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

-- 6. KRUSIAL: Isi tabel auth.identities untuk semua akun auth
--    (Supabase GoTrue mewajibkan adanya entri identitas agar login tidak menghasilkan error 500)
INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  id,
  id,
  json_build_object('sub', id::text, 'email', email)::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM auth.identities);

-- 7. Pastikan semua kurir berstatus approved
UPDATE public.users SET status_approval = 'approved' WHERE role = 'kurir';
