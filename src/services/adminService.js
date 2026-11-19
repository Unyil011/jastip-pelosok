import { supabase } from '../lib/supabaseClient';

export const adminService = {
  /**
   * Mengambil daftar kurir yang masih pending approval
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
