import { supabase } from '../lib/supabaseClient';

// Daftar 11 Desa Resmi Pelosok Naringgul dengan format UUID valid
export const DEFAULT_DESA_LIST = [
  { id: '10000000-0000-0000-0000-000000000001', nama_desa: 'Balegede' },
  { id: '10000000-0000-0000-0000-000000000002', nama_desa: 'Cinerang' },
  { id: '10000000-0000-0000-0000-000000000003', nama_desa: 'Malati' },
  { id: '10000000-0000-0000-0000-000000000004', nama_desa: 'Margasari' },
  { id: '10000000-0000-0000-0000-000000000005', nama_desa: 'Mekarsari' },
  { id: '10000000-0000-0000-0000-000000000006', nama_desa: 'Naringgul' },
  { id: '10000000-0000-0000-0000-000000000007', nama_desa: 'Sukabakti' },
  { id: '10000000-0000-0000-0000-000000000008', nama_desa: 'Sukamulya' },
  { id: '10000000-0000-0000-0000-000000000009', nama_desa: 'Wanasari' },
  { id: '10000000-0000-0000-0000-000000000010', nama_desa: 'Wangunjaya' },
  { id: '10000000-0000-0000-0000-000000000011', nama_desa: 'Wangunsari' },
];

export const NARINGGUL_VILLAGES = [
  'Balegede',
  'Cinerang',
  'Malati',
  'Margasari',
  'Mekarsari',
  'Naringgul',
  'Sukabakti',
  'Sukamulya',
  'Wanasari',
  'Wangunjaya',
  'Wangunsari',
];

export const villageService = {
  /**
   * Mengambil semua daftar desa (dari Supabase dengan fallback ke daftar resmi)
   */
  async getAllDesa() {
    try {
      const { data, error } = await supabase
        .from('desa')
        .select('id, nama_desa')
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
   * Mengambil daftar nama desa murni untuk checklist tugas admin
   */
  getVillageNames() {
    return NARINGGUL_VILLAGES;
  },
};
