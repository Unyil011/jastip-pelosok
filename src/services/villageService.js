import { supabase } from '../lib/supabaseClient';

export const JALUR_LIST = [
  { id: '11111111-1111-1111-1111-111111111111', nama_jalur: 'Jalur 1 - Naringgul Barat' },
  { id: '22222222-2222-2222-2222-222222222222', nama_jalur: 'Jalur 2 - Naringgul Timur' },
];

export const JALUR_MAP = {
  '11111111-1111-1111-1111-111111111111': 'Jalur 1 - Naringgul Barat',
  '22222222-2222-2222-2222-222222222222': 'Jalur 2 - Naringgul Timur',
};

// Daftar 11 Desa Resmi Pelosok Naringgul dengan Jalur & UUID valid
export const DEFAULT_DESA_LIST = [
  { id: '10000000-0000-0000-0000-000000000001', nama_desa: 'Balegede', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000002', nama_desa: 'Cinerang', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000003', nama_desa: 'Malati', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000004', nama_desa: 'Margasari', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000005', nama_desa: 'Mekarsari', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000006', nama_desa: 'Naringgul', jalur_id: '11111111-1111-1111-1111-111111111111' },
  { id: '10000000-0000-0000-0000-000000000007', nama_desa: 'Sukabakti', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: '10000000-0000-0000-0000-000000000008', nama_desa: 'Sukamulya', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: '10000000-0000-0000-0000-000000000009', nama_desa: 'Wanasari', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: '10000000-0000-0000-0000-000000000010', nama_desa: 'Wangunjaya', jalur_id: '22222222-2222-2222-2222-222222222222' },
  { id: '10000000-0000-0000-0000-000000000011', nama_desa: 'Wangunsari', jalur_id: '22222222-2222-2222-2222-222222222222' },
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
        .select('id, nama_desa, jalur_id')
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
   * Mengambil semua master jalur
   */
  async getAllJalur() {
    try {
      const { data, error } = await supabase
        .from('jalur')
        .select('id, nama_jalur')
        .order('nama_jalur', { ascending: true });

      if (error || !data || data.length === 0) {
        return JALUR_LIST;
      }
      return data;
    } catch {
      return JALUR_LIST;
    }
  },

  /**
   * Mendapatkan nama jalur dari jalur_id
   */
  getJalurName(jalurId) {
    if (!jalurId) return 'Jalur Hub Pelosok';
    return JALUR_MAP[jalurId] || 'Jalur Hub Pelosok';
  },

  /**
   * Mengambil daftar nama desa murni untuk checklist tugas admin
   */
  getVillageNames() {
    return NARINGGUL_VILLAGES;
  },
};
