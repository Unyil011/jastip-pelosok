import { supabase } from '../lib/supabaseClient';

// Daftar 11 Desa Resmi Pelosok Naringgul
export const DEFAULT_DESA_LIST = [
  { id: 'desa-balegede', nama_desa: 'Balegede', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-cinerang', nama_desa: 'Cinerang', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-malati', nama_desa: 'Malati', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-margasari', nama_desa: 'Margasari', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-mekarsari', nama_desa: 'Mekarsari', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-naringgul', nama_desa: 'Naringgul', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: 'desa-sukabakti', nama_desa: 'Sukabakti', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'desa-sukamulya', nama_desa: 'Sukamulya', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'desa-wanasari', nama_desa: 'Wanasari', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'desa-wangunjaya', nama_desa: 'Wangunjaya', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: 'desa-wangunsari', nama_desa: 'Wangunsari', jalur_id: '22222222-2222-2222-2222-222222222222' },
];

export const DEFAULT_JALUR_LIST = [
  { id: '11111111-1111-1111-1111-111111111111', nama_jalur: 'Jalur 1 - Naringgul Barat' },
  { id: '22222222-2222-2222-2222-222222222222', nama_jalur: 'Jalur 2 - Naringgul Timur' },
];

export const villageService = {
  /**
   * Mengambil semua daftar desa (dari Supabase dengan fallback ke daftar resmi)
   */
  async getAllDesa() {
    try {
      const { data, error } = await supabase
        .from('desa')
        .select('id, nama_desa, jalur_id, jalur:jalur_id (nama_jalur)')
        .order('nama_desa', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_DESA_LIST;
      }
      return data;
    } catch {
      return DEFAULT_DESA_LIST;
    }
  },

  /**
   * Mengambil semua daftar jalur
   */
  async getAllJalur() {
    try {
      const { data, error } = await supabase
        .from('jalur')
        .select('id, nama_jalur')
        .order('nama_jalur', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_JALUR_LIST;
      }
      return data;
    } catch {
      return DEFAULT_JALUR_LIST;
    }
  },
};
