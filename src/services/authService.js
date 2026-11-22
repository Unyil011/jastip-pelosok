import { supabase } from '../lib/supabaseClient';
import { phoneToSyntheticEmail, sanitizePhone } from '../utils/formatters';

/**
 * Cek apakah profil customer sudah lengkap data alamat & kontak WA-nya
 */
export function isCustomerProfileComplete(profile) {
  if (!profile) return false;
  // Wajib memiliki nomor HP (minimal 10 digit) dan alamat yang valid
  const hasPhone = !!(profile.no_hp && profile.no_hp.trim().length >= 10);
  const hasAddress = !!(profile.alamat && profile.alamat.trim().length >= 8);
  return hasPhone && hasAddress;
}

export const authService = {
  /**
   * Login menggunakan Google OAuth (Pilihan Utama Customer)
   */
  async loginWithGoogle() {
    const redirectUrl = `${window.location.origin}/dashboard-customer`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) throw error;
    return data;
  },

  /**
   * Memastikan data profil user ada di tabel public.users.
   * Dipanggil otomatis saat OAuth berhasil login pertama kali.
   */
  async ensureUserProfile(user) {
    if (!user) return null;

    try {
      // 1. Cek apakah record profil sudah ada
      const { data: existingProfile } = await supabase
        .from('users')
        .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana, foto_url, latitude, longitude')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        return existingProfile;
      }

      // 2. Jika belum ada (pengguna baru via Google), buat profil customer default
      const defaultName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (user.email ? user.email.split('@')[0] : 'Customer');

      const avatarFromGoogle = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      const newProfile = {
        id: user.id,
        nama: defaultName,
        no_hp: user.user_metadata?.phone || null,
        role: 'customer',
        status_approval: 'approved',
        alamat: null,
        foto_url: avatarFromGoogle,
        latitude: null,
        longitude: null,
      };

      const { data: createdProfile, error: insertError } = await supabase
        .from('users')
        .insert(newProfile)
        .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana, foto_url, latitude, longitude')
        .single();

      if (insertError) {
        console.warn('Perhatian saat menyimpan profil pengguna baru:', insertError.message);
        return newProfile;
      }

      return createdProfile;
    } catch (err) {
      console.error('Error saat memastikan profil user:', err);
      return null;
    }
  },

  /**
   * Memperbarui data profil, foto WebP, alamat lengkap & koordinat maps customer
   */
  async updateCustomerProfile(userId, { name, phone, address, jalurId, fotoUrl, latitude, longitude }) {
    const cleanPhone = sanitizePhone(phone);
    const updates = {
      nama: name.trim(),
      no_hp: cleanPhone,
      alamat: address.trim(),
    };

    if (jalurId) updates.jalur_id = jalurId;
    if (fotoUrl !== undefined) updates.foto_url = fotoUrl;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana, foto_url, latitude, longitude')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Pendaftaran Mandiri Mitra Kurir
   */
  async registerKurir({ name, phone, password, danaNumber, jalurId = null }) {
    const rawInput = phone ? phone.trim() : '';
    let email;
    let cleanPhone = sanitizePhone(rawInput);

    if (rawInput.includes('@')) {
      email = rawInput.toLowerCase();
    } else {
      if (!cleanPhone || cleanPhone.length < 10) {
        throw new Error('Nomor HP/WhatsApp minimal 10 digit angka.');
      }
      email = phoneToSyntheticEmail(cleanPhone);
    }

    // 1. Daftarkan di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message?.includes('User already registered')) {
        throw new Error('Nomor HP/Email ini sudah terdaftar. Silakan langsung login.');
      }
      throw authError;
    }

    const user = authData.user;
    if (!user) throw new Error('Gagal mendaftarkan akun kurir.');

    // 2. Simpan profil ke public.users
    const profilePayload = {
      id: user.id,
      nama: name.trim(),
      no_hp: cleanPhone || null,
      role: 'kurir',
      status_approval: 'approved', // Auto-approved agar kurir bisa langsung beroperasi
      nomor_dana: danaNumber ? danaNumber.trim() : null,
      jalur_id: jalurId || null,
    };

    const { error: profileError } = await supabase.from('users').insert(profilePayload);
    if (profileError) {
      // Jika profil sudah terbuat via trigger, update statusnya
      await supabase.from('users').update({
        nama: name.trim(),
        role: 'kurir',
        status_approval: 'approved',
        nomor_dana: danaNumber ? danaNumber.trim() : null,
      }).eq('id', user.id);
    }

    return user;
  },

  /**
   * Login Petugas / Kurir / Admin (menggunakan Nomor HP atau Email dan Kata Sandi)
   */
  async login({ phone, password }) {
    const input = phone ? phone.trim() : '';
    let email;

    if (input.includes('@')) {
      email = input.toLowerCase();
    } else {
      const cleanPhone = sanitizePhone(input);
      if (!cleanPhone) {
        throw new Error('Harap masukkan nomor HP atau email yang valid.');
      }
      email = phoneToSyntheticEmail(cleanPhone);
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      if (authError.message?.includes('Email not confirmed')) {
        throw new Error(
          'Email belum diverifikasi di Supabase. Harap nonaktifkan toggle "Confirm email" di Dashboard Supabase (Authentication -> Providers -> Email) atau jalankan file "quick_setup_auth.sql" di SQL Editor.'
        );
      }
      throw new Error('Nomor HP / Email atau kata sandi tidak sesuai.');
    }

    const userId = authData.user.id;

    // Ambil profil user
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana, foto_url, latitude, longitude')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) {
      // Profil darurat bila data public.users belum terbuat
      const syntheticRole = email.includes('admin') ? 'admin' : 'kurir';
      const syntheticProfile = {
        id: userId,
        nama: authData.user.user_metadata?.name || (syntheticRole === 'admin' ? 'Administrator' : 'Kurir Pelosok'),
        no_hp: input.includes('@') ? null : sanitizePhone(input),
        role: syntheticRole,
        status_approval: 'approved',
        jalur_id: null,
      };
      await supabase.from('users').insert(syntheticProfile);
      return syntheticProfile;
    }

    // Blokir jika kurir belum disetujui
    if (profile.role === 'kurir') {
      if (profile.status_approval === 'pending') {
        await supabase.auth.signOut();
        throw new Error('Akun kurir Anda masih menunggu persetujuan admin.');
      }
      if (profile.status_approval === 'rejected') {
        await supabase.auth.signOut();
        throw new Error('Pendaftaran akun kurir Anda ditolak oleh admin.');
      }
    }

    return profile;
  },

  /**
   * Logout user saat ini
   */
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Ambil profil user yang sedang login saat ini
   */
  async getCurrentUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return await this.ensureUserProfile(user);
  },
};
