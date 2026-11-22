-- Seed script to create a default admin account for Jastip Pelosok
-- This script assumes the Supabase database schema with tables:
--   public.users (id UUID, nama TEXT, no_hp TEXT, role TEXT, status_approval TEXT, alamat TEXT, foto_url TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION)
--   auth.users (id UUID, email TEXT, encrypted_password TEXT, email_confirmed_at TIMESTAMP, role TEXT)

-- 1. Generate a UUID for the admin user (replace <ADMIN_UUID> with a real UUID or let the DB generate one)
-- 2. Insert into auth.users via the Supabase auth function `auth.sign_up` (or direct insert if using the service role key).
--    Here we use the Supabase auth helper function `auth.sign_up` for clarity; you may replace it with your preferred method.

-- Replace the placeholder password with a strong default or generate it randomly.

DO $$
DECLARE
    admin_uid uuid := gen_random_uuid();
    admin_email text := 'admin@jastip.com';
    admin_password text := 'ChangeMe123!'; -- TODO: change after first login
BEGIN
    -- Create auth user (requires service_role key in the environment)
    PERFORM auth.sign_up(
        email => admin_email,
        password => admin_password,
        options => jsonb_build_object('email_confirmed', true)
    );

    -- Retrieve the generated auth user id (if not the same as admin_uid)
    SELECT id INTO admin_uid FROM auth.users WHERE email = admin_email LIMIT 1;

    -- Insert corresponding profile record into public.users
    INSERT INTO public.users (
        id, nama, no_hp, role, status_approval, alamat, foto_url, latitude, longitude
    ) VALUES (
        admin_uid,
        'Administrator',
        '0000000000',
        'admin',
        'approved',
        'Kantor Jastip Pelosok',
        NULL,
        0.0,
        0.0
    );
END $$;

-- After running this script, you can log in with:
--   Email: admin@jastip.com
--   Password: ChangeMe123!
-- Remember to change the password on first login.
