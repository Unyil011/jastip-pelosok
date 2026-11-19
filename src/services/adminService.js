import { supabase } from '../lib/supabaseClient';
import { phoneToSyntheticEmail, sanitizePhone } from '../utils/formatters';

export const adminService = {
  /**
   * Membuat Akun Kurir Baru Langsung oleh Admin (Status: Approved)
   */
  async createKurirByAdmin({ name, phone, password, danaNumber, jalurId }) {
    const cleanPhone = sanitizePhone(phone);
    const email = phoneToSyntheticEmail(cleanPhone);

    // 1. Daftarkan di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    const user = authData.user;
    if (!user) throw new Error('Gagal membuat kredensial akun kurir.');

    // 2. Simpan ke tabel public.users dengan role 'kurir' dan status 'approved'
    const { error: profileError } = await supabase.from('users').insert({
      id: user.id,
      nama: name,
      no_hp: cleanPhone,
      role: 'kurir',
      status_approval: 'approved',
      nomor_dana: danaNumber,
      jalur_id: jalurId,
    });

    if (profileError) throw profileError;
    return user;
  },

  /**
   * Mengambil semua daftar kurir (aktif maupun pending)
   */
  async getAllKurirs() {
    const { data, error } = await supabase
      .from('users')
      .select('id, nama, no_hp, nomor_dana, status_approval, jalur_id, jalur:jalur_id (nama_jalur), created_at')
      .eq('role', 'kurir')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil daftar kurir yang masih pending approval (jika ada)
   */
  async getPendingKurirs() {
    const { data, error } = await supabase
      .from('users')
      .select('id, nama, no_hp, nomor_dana, status_approval, created_at')
      .eq('role', 'kurir')
      .eq('status_approval', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Menyetujui kurir dan menetapkan jalur_id
   */
  async approveKurir(kurirId, jalurId) {
    if (!jalurId) throw new Error('Harap pilih jalur pengantaran untuk kurir ini.');

    const { data, error } = await supabase
      .from('users')
      .update({
        status_approval: 'approved',
        jalur_id: jalurId,
      })
      .eq('id', kurirId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Menolak pendaftaran kurir
   */
  async rejectKurir(kurirId) {
    const { data, error } = await supabase
      .from('users')
      .update({
        status_approval: 'rejected',
      })
      .eq('id', kurirId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mengambil semua daftar customer (untuk pembuatan order manual oleh admin)
   */
  async getAllCustomers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, nama, no_hp, alamat')
      .eq('role', 'customer')
      .order('nama', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
