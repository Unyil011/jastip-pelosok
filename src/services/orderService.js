import { supabase } from '../lib/supabaseClient';
import { villageService } from './villageService';

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
    // Default ke Jalur 1 jika tidak ditentukan
    const finalJalurId = jalurId || '11111111-1111-1111-1111-111111111111';

    const newOrder = {
      customer_id: customerId,
      jalur_id: finalJalurId,
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
        // Coba fallback tanpa jalur_id jika foreign key jalur bermasalah
        const { data: retryData, error: retryError } = await supabase
          .from('orders')
          .insert({ ...newOrder, jalur_id: null })
          .select()
          .single();
        if (retryError) throw retryError;
        this.notifyOrderCreated(retryData);
        return retryData;
      }
      throw error;
    }

    this.notifyOrderCreated(data);
    return data;
  },

  /**
   * Mengirim notifikasi / event lokal dan broadcast storage saat ada order baru
   */
  notifyOrderCreated(order) {
    try {
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('jastip:orderCreated', { detail: order });
        window.dispatchEvent(event);
        // Trigger storage event untuk tab browser lain
        localStorage.setItem('jastip_last_order_event', JSON.stringify({ id: order?.id, time: Date.now() }));
      }
    } catch (e) {
      console.warn('Gagal dispatch event orderCreated:', e);
    }
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
      jalur_id: jalurId || '11111111-1111-1111-1111-111111111111',
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
    this.notifyOrderCreated(data);
    return data;
  },

  /**
   * Ambil Riwayat Order milik Customer saat ini
   */
  async getOrdersByCustomerId(customerId) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Perkaya data dengan nama jalur aman
    return (data || []).map((order) => ({
      ...order,
      jalur: { nama_jalur: villageService.getJalurName(order.jalur_id) },
    }));
  },

  /**
   * Cari Order berdasarkan Nomor Resi (Fitur Scan Barcode Admin & Kurir)
   */
  async findOrderByResi(nomorResi) {
    const cleanResi = nomorResi?.trim();
    if (!cleanResi) return null;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, customer:customer_id (id, nama, no_hp, alamat, latitude, longitude)')
        .ilike('nomor_resi', cleanResi)
        .maybeSingle();

      if (error || !data) {
        // Fallback query langsung jika relasi customer terkendala
        const { data: rawOrder, error: rawErr } = await supabase
          .from('orders')
          .select('*')
          .ilike('nomor_resi', cleanResi)
          .maybeSingle();

        if (rawErr || !rawOrder) return null;

        // Ambil profil customer secara mandiri jika ada customer_id
        let customerData = null;
        if (rawOrder.customer_id) {
          const { data: cData } = await supabase
            .from('users')
            .select('id, nama, no_hp, alamat, latitude, longitude')
            .eq('id', rawOrder.customer_id)
            .maybeSingle();
          customerData = cData;
        }

        return {
          ...rawOrder,
          customer: customerData,
          jalur: { nama_jalur: villageService.getJalurName(rawOrder.jalur_id) },
        };
      }

      return {
        ...data,
        jalur: { nama_jalur: villageService.getJalurName(data.jalur_id) },
      };
    } catch (err) {
      console.error('findOrderByResi error:', err);
      return null;
    }
  },

  /**
   * Admin: Ambil Daftar Order yang Pending Konfirmasi
   */
  async getPendingConfirmationOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, customer:customer_id (id, nama, no_hp, alamat)')
      .eq('status_konfirmasi', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      // Fallback query tanpa relasi jika schema cache belum sync
      const { data: rawOrders, error: rawErr } = await supabase
        .from('orders')
        .select('*')
        .eq('status_konfirmasi', 'pending')
        .order('created_at', { ascending: false });
      if (rawErr) throw rawErr;
      return (rawOrders || []).map((order) => ({
        ...order,
        jalur: { nama_jalur: villageService.getJalurName(order.jalur_id) },
      }));
    }

    return (data || []).map((order) => ({
      ...order,
      jalur: { nama_jalur: villageService.getJalurName(order.jalur_id) },
    }));
  },

  /**
   * Admin / Kurir: Konfirmasi atau Tolak Order
   */
  async updateConfirmationStatus(orderId, status) {
    const updates = {
      status_konfirmasi: status,
    };
    if (status === 'dikonfirmasi') {
      updates.status_pengiriman = 'diterima_hub';
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    this.notifyOrderCreated(data);
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
    this.notifyOrderCreated(data);
    return data;
  },

  /**
   * Kurir: Ambil Order Aktif di Wilayah Desa Tugas Kurir
   */
  async getOrdersForKurir(kurirProfile) {
    let query = supabase
      .from('orders')
      .select('*, customer:customer_id (id, nama, no_hp, alamat, latitude, longitude)')
      .in('status_pengiriman', ['diterima_hub', 'dalam_perjalanan', 'terkirim', 'retur'])
      .order('created_at', { ascending: true });

    let { data, error } = await query;
    if (error) {
      // Fallback query tanpa join
      const { data: rawData, error: rawErr } = await supabase
        .from('orders')
        .select('*')
        .in('status_pengiriman', ['diterima_hub', 'dalam_perjalanan', 'terkirim', 'retur'])
        .order('created_at', { ascending: true });
      if (rawErr) throw rawErr;
      data = rawData || [];
    }

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
    this.notifyOrderCreated(data);
    return data;
  },

  /**
   * Customer: Ajukan Retur Paket (Maksimal 2 hari setelah status terkirim)
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
      ongkir_diterima: numericOngkir,
      status_pembayaran: numericOngkir > 0 ? 'lunas' : 'belum_lunas',
      deskripsi_barang: updatedDeskripsi,
    };

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, customer:customer_id (id, nama, no_hp, alamat)')
      .single();

    if (error) {
      if (error.message?.includes('delivery_status')) {
        throw new Error(
          "Tipe enum database belum diperbarui. Harap jalankan file 'db/seeds/quick_setup_auth.sql' di Supabase SQL Editor untuk mengaktifkan status retur."
        );
      }
      throw error;
    }
    this.notifyOrderCreated(data);
    return data;
  },
};
