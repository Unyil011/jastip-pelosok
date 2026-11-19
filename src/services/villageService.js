import { supabase } from '../lib/supabaseClient';

export const villageService = {
  /**
   * Mengambil semua daftar desa beserta jalur_id
   */
  async getAllDesa() {
    const { data, error } = await supabase
      .from('desa')
      .select('id, nama_desa, jalur_id, jalur:jalur_id (nama_jalur)')
      .order('nama_desa', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mengambil semua daftar jalur (untuk assign admin)
   */
  async getAllJalur() {
    const { data, error } = await supabase
      .from('jalur')
      .select('id, nama_jalur')
      .order('nama_jalur', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
