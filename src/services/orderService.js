import { supabase } from '../lib/supabaseClient';

export const orderService = {
  /**
   * Buat Order Baru oleh Customer
   */
  async createOrderByCustomer({
    customerId,
    jalurId,
    jenisBarang,
    nomorResi,
    deskripsiBarang,
    metodePembayaran,
    alamatTujuan,
  }) {
    const newOrder = {
      customer_id: customerId,
      jalur_id: jalurId,
      jenis_barang: jenisBarang,
      nomor_resi: jenisBarang === 'paket_ekspedisi' ? (nomorResi?.trim() || null) : null,
      deskripsi_barang: deskripsiBarang,
      dibuat_oleh: 'customer',
      status_konfirmasi: 'pending',
      metode_pembayaran: metodePembayaran,
      ongkir_patokan: 0,
      ongkir_diterima: 0,
      status_pembayaran: 'belum_lunas',
      status_pengiriman: 'dipesan',
      alamat_tujuan: alamatTujuan,
    };

    const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
    if (error) {
      if (
        error.message?.includes('violates foreign key constraint') ||
        error.message?.includes('violates not-null constraint') ||
        error.message?.includes('jalur_id')
      ) {
        throw new Error(
          'Master data Jalur & Desa di database Supabase belum terisi. Harap jalankan skrip "db/seeds/quick_setup_auth.sql" di Supabase SQL Editor agar pesanan dapat disimpan.'
        );
      }
      if (error.message?.includes('violates row-level security policy')) {
        throw new Error(
          'Izin akses pesanan database (RLS) belum dibuka. Harap jalankan skrip "db/seeds/quick_setup_auth.sql" di Supabase SQL Editor.'
        );
      }
      throw error;
    }
    return data;
  },

  /**
   * Buat Order Manual oleh Admin (misal hasil scan paket tak terdaftar)
   */
  async createOrderByAdmin({
    customerId,
    jalurId,
    nomorResi,
    jenisBarang = 'paket_ekspedisi',
    deskripsiBarang,
    metodePembayaran = 'COD',
    alamatTujuan,
    ongkirPatokan = 0,
  }) {
    const newOrder = {
      customer_id: customerId,
      jalur_id: jalurId,
      jenis_barang: jenisBarang,
      nomor_resi: nomorResi?.trim() || null,
      deskripsi_barang: deskripsiBarang,
      dibuat_oleh: 'admin',
      status_konfirmasi: 'dikonfirmasi', // Langsung confirmed jika dibuat admin
      metode_pembayaran: metodePembayaran,
      ongkir_patokan: ongkirPatokan,
      ongkir_diterima: 0,
      status_pembayaran: 'belum_lunas',
      status_pengiriman: 'diterima_hub', // Langsung siap antar di hub
      alamat_tujuan: alamatTujuan,
    };

    const { data, error } = await supabase.from('orders').insert(newOrder).select().single();
    if (error) throw error;
    return data;
  },

  /**
   * Ambil Riwayat Order milik Customer saat ini
   */
  async getOrdersByCustomerId(customerId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, jalur:jalur_id (nama_jalur)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Cari Order berdasarkan Nomor Resi (Fitur Scan Barcode)
   */
  async findOrderByResi(nomorResi) {
    const cleanResi = nomorResi?.trim();
    if (!cleanResi) return null;

    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customer_id (nama, no_hp, alamat), jalur:jalur_id (nama_jalur)')
      .eq('nomor_resi', cleanResi)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  /**
   * Admin: Ambil Daftar Order yang Pending Konfirmasi
   */
  async getPendingConfirmationOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customer_id (nama, no_hp), jalur:jalur_id (nama_jalur)')
      .eq('status_konfirmasi', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Admin: Konfirmasi atau Tolak Order
   */
  async updateConfirmationStatus(orderId, status) {
    const updates = {
      status_konfirmasi: status,
    };
    if (status === 'dikonfirmasi') {
      // Jika dikonfirmasi, otomatis siap/masuk hub
      updates.status_pengiriman = 'diterima_hub';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update Status Pengiriman (dipesan -> diterima_hub -> dalam_perjalanan -> terkirim)
   */
  async updateDeliveryStatus(orderId, deliveryStatus, extraData = {}) {
    const updates = {
      status_pengiriman: deliveryStatus,
      ...extraData,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Kurir: Ambil Order Aktif di Wilayah Desa Tugas Kurir
   * Sesuai instruksi:
   * 1. Jika kurir memegang desa tertentu (misal: ['Naringgul', 'Balegede']), hanya orderan ke desa tersebut yang tampil.
   * 2. Jika 1 kurir (default 'Semua Desa'), otomatis semua orderan desa tampil.
   */
  async getOrdersForKurir(kurirProfile) {
    let query = supabase
      .from('orders')
      .select('*, customer:customer_id (nama, no_hp, alamat, latitude, longitude)')
      .eq('status_konfirmasi', 'dikonfirmasi')
      .in('status_pengiriman', ['diterima_hub', 'dalam_perjalanan', 'terkirim', 'retur'])
      .order('created_at', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return [];

    // Jika kurirProfile string (id jalur lama)
    if (typeof kurirProfile === 'string') {
      return data;
    }

    // Ambil wilayah penugasan desa dari admin (disimpan di kurirProfile.alamat)
    const wilayah = kurirProfile?.alamat;
    if (!wilayah || wilayah === 'Semua Desa' || wilayah.toLowerCase().includes('semua')) {
      return data; // Default: Semua desa untuk kurir tunggal
    }

    const assignedDesas = wilayah
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    if (assignedDesas.length === 0) return data;

    // Filter orderan yang alamat_tujuan atau deskripsi_barang mengandung salah satu desa tugas kurir
    return data.filter((order) => {
      const alamatLower = (order.alamat_tujuan || '').toLowerCase();
      const descLower = (order.deskripsi_barang || '').toLowerCase();
      return assignedDesas.some(
        (desa) => alamatLower.includes(desa) || descLower.includes(desa)
      );
    });
  },

  /**
   * Kurir: Proses Retur Paket
   * Jika barang diretur (ditolak customer / alamat tak ketemu / barang rusak),
   * kurir tetap berhak menerima uang ongkos kirim atas jerih payah perjalanan pelosok.
   * Nilai COD barang dibatalkan (0) dan hanya ongkir yang dicatat.
   */
  async processReturnOrder(orderId, {
    kurirId,
    alasanRetur,
    catatanRetur,
    ongkirDiterima = 0,
    currentDeskripsi = '',
  }) {
    const returTag = `[RETUR - ${alasanRetur || 'Dibatalkan'}${catatanRetur ? `: ${catatanRetur}` : ''}]`;
    const updatedDeskripsi = currentDeskripsi
      ? `${currentDeskripsi}\n${returTag}`
      : returTag;

    const numericOngkir = parseFloat(ongkirDiterima) || 0;

    const updates = {
      status_pengiriman: 'retur',
      kurir_id: kurirId,
      ongkir_diterima: numericOngkir,
      status_pembayaran: numericOngkir > 0 ? 'lunas' : 'belum_lunas',
      deskripsi_barang: updatedDeskripsi,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) {
      if (error.message?.includes('delivery_status')) {
        throw new Error(
          "Tipe enum database belum diperbarui. Harap jalankan file 'db/seeds/add_retur_status.sql' di Supabase SQL Editor untuk mengaktifkan status retur."
        );
      }
      throw error;
    }
    return data;
  },

  /**
   * Customer: Ajukan Retur Paket (Maksimal 2 hari setelah status terkirim)
   * Ketentuan Bisnis:
   * Meskipun barang diretur, ongkir kurir kita TETAP DIBAYAR kepada kurir
   * atas jerih payah perjalanan mengantar ke pelosok desa.
   */
  async requestCustomerReturn(orderId, {
    alasan,
    kontakWa = '',
    currentDeskripsi = '',
    ongkir = 0,
  }) {
    const cleanAlasan = alasan ? alasan.trim() : '';
    if (!cleanAlasan) {
      throw new Error('Harap tuliskan alasan pengajuan retur barang.');
    }

    const timestamp = new Date().toISOString();
    const returTag = `[RETUR_CUSTOMER: ${cleanAlasan}${kontakWa ? ` (WA: ${kontakWa.trim()})` : ''} | Diajukan: ${timestamp} | Ketentuan: Ongkir kurir tetap dibayarkan]`;
    const updatedDeskripsi = currentDeskripsi
      ? `${currentDeskripsi}\n\n${returTag}`
      : returTag;

    const numericOngkir = parseFloat(ongkir) || 0;

    const updates = {
      status_pengiriman: 'retur',
      // Ongkir kurir tetap dipertahankan dan dibayar penuh untuk kurir
      ongkir_diterima: numericOngkir,
      status_pembayaran: numericOngkir > 0 ? 'lunas' : 'belum_lunas',
      deskripsi_barang: updatedDeskripsi,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, customer:customer_id (nama, no_hp, alamat), jalur:jalur_id (nama_jalur)')
      .single();

    if (error) {
      if (error.message?.includes('delivery_status')) {
        throw new Error(
          "Tipe enum database belum diperbarui. Harap jalankan file 'db/seeds/quick_setup_auth.sql' di Supabase SQL Editor untuk mengaktifkan status retur."
        );
      }
      throw error;
    }
    return data;
  },
};
