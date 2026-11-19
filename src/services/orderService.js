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
    if (error) throw error;
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
   * Kurir: Ambil Order Aktif di Jalur Kurir (status 'diterima_hub' atau 'dalam_perjalanan')
   */
  async getOrdersForKurir(jalurId) {
    if (!jalurId) return [];

    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customer_id (nama, no_hp, alamat)')
      .eq('jalur_id', jalurId)
      .eq('status_konfirmasi', 'dikonfirmasi')
      .in('status_pengiriman', ['diterima_hub', 'dalam_perjalanan'])
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },
};
