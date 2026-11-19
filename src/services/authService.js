import { supabase } from '../lib/supabaseClient';
import { phoneToSyntheticEmail, sanitizePhone } from '../utils/formatters';

export const authService = {
  /**
   * Registrasi Customer (Langsung Approved)
   */
  async registerCustomer({ name, phone, password, address }) {
    const cleanPhone = sanitizePhone(phone);
    const email = phoneToSyntheticEmail(cleanPhone);

    // 1. Buat user di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Gagal membuat kredensial akun.');

    // 2. Simpan profil ke public.users
    const { error: profileError } = await supabase.from('users').insert({
      id: user.id,
      nama: name,
      no_hp: cleanPhone,
      role: 'customer',
      status_approval: 'approved',
      alamat: address,
    });

    if (profileError) throw profileError;
    return user;
  },

  /**
   * Registrasi Kurir (Status Approval: pending & langsung sign out)
   */
  async registerKurir({ name, phone, password, danaNumber }) {
    const cleanPhone = sanitizePhone(phone);
    const email = phoneToSyntheticEmail(cleanPhone);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Gagal membuat kredensial akun.');

    const { error: profileError } = await supabase.from('users').insert({
      id: user.id,
      nama: name,
      no_hp: cleanPhone,
      role: 'kurir',
      status_approval: 'pending',
      nomor_dana: danaNumber,
    });

    if (profileError) throw profileError;

    // Logout paksa agar kurir pending tidak bisa langsung akses
    await supabase.auth.signOut();
    return true;
  },

  /**
   * Login & Validasi Role / Approval Kurir
   */
  async login({ phone, password }) {
    const cleanPhone = sanitizePhone(phone);
    const email = phoneToSyntheticEmail(cleanPhone);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) throw new Error('Nomor HP atau kata sandi tidak sesuai.');

    const userId = authData.user.id;

    // Ambil profil user
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      throw new Error('Data profil pengguna tidak ditemukan di sistem.');
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

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, nama, no_hp, role, status_approval, jalur_id, alamat, nomor_dana')
      .eq('id', user.id)
      .single();

    if (error) return null;
    return profile;
  },
};
