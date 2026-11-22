/**
 * Helper untuk memformat angka ke mata uang Rupiah
 */
export function formatRupiah(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Helper untuk format tanggal Indonesia
 */
export function formatDateIndonesia(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Membersihkan format nomor HP (0812-3456-7890 -> 081234567890)
 */
export function sanitizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Mengubah no HP menjadi format email sintetis untuk Supabase Auth.
 * Menggunakan domain standar '.com' agar lolos validasi TLD Supabase GoTrue Auth.
 */
export function phoneToSyntheticEmail(phone) {
  const clean = sanitizePhone(phone);
  return `${clean}@jastip.com`;
}

/**
 * Cek apakah string tanggal jatuh pada hari ini
 */
export function isDateToday(dateString) {
  if (!dateString) return false;
  const target = new Date(dateString);
  const now = new Date();
  return (
    target.getFullYear() === now.getFullYear() &&
    target.getMonth() === now.getMonth() &&
    target.getDate() === now.getDate()
  );
}

/**
 * Cek apakah string tanggal jatuh pada hari kemarin
 */
export function isDateYesterday(dateString) {
  if (!dateString) return false;
  const target = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    target.getFullYear() === yesterday.getFullYear() &&
    target.getMonth() === yesterday.getMonth() &&
    target.getDate() === yesterday.getDate()
  );
}

/**
 * Helper label dan warna badge untuk status pengiriman
 */
export function getDeliveryStatusMeta(status) {
  switch (status) {
    case 'dipesan':
      return { label: 'Dipesan', variant: 'warning' };
    case 'diterima_hub':
      return { label: 'Di Hub / Sortir', variant: 'info' };
    case 'dalam_perjalanan':
      return { label: 'Dalam Perjalanan', variant: 'primary' };
    case 'terkirim':
      return { label: 'Terkirim', variant: 'success' };
    case 'retur':
      return { label: 'Diretur (Ongkir Saja)', variant: 'danger' };
    default:
      return { label: status || 'Pending', variant: 'neutral' };
  }
}

/**
 * Helper label untuk status konfirmasi
 */
export function getConfirmationStatusMeta(status) {
  switch (status) {
    case 'pending':
      return { label: 'Menunggu Konfirmasi', variant: 'warning' };
    case 'dikonfirmasi':
      return { label: 'Dikonfirmasi', variant: 'success' };
    case 'ditolak':
      return { label: 'Ditolak', variant: 'danger' };
    default:
      return { label: status, variant: 'neutral' };
  }
}

/**
 * Ekstraksi informasi retur dari deskripsi barang jika ada
 */
export function parseReturInfo(deskripsi) {
  if (!deskripsi) return null;
  // Format retur customer: [RETUR_CUSTOMER: alasan | Diajukan: ISOString | Ketentuan: ...]
  const customerMatch = deskripsi.match(/\[RETUR_CUSTOMER:\s*([^|\]]+)(?:\|\s*Diajukan:\s*([^|\]]+))?(?:\|\s*([^\]]+))?\]/i);
  if (customerMatch) {
    return {
      isRetur: true,
      tipe: 'customer',
      alasan: customerMatch[1]?.trim() || 'Paket diajukan retur oleh customer',
      diajukanPada: customerMatch[2]?.trim() || null,
      ketentuan: customerMatch[3]?.trim() || 'Ongkir kurir tetap dibayarkan',
    };
  }

  // Format retur kurir: [RETUR - alasan: catatan]
  const kurirMatch = deskripsi.match(/\[RETUR\s*-\s*([^\]]+)\]/i);
  if (kurirMatch) {
    return {
      isRetur: true,
      tipe: 'kurir',
      alasan: kurirMatch[1]?.trim() || 'Paket diretur saat pengantaran kurir',
      diajukanPada: null,
      ketentuan: 'Ongkir kurir tetap dibayarkan',
    };
  }

  return null;
}

/**
 * Cek kelayakan pesanan untuk diajukan retur (Maksimal 2 hari / 48 jam sejak paket terkirim)
 */
export function checkReturnEligibility(order) {
  if (!order) return { eligible: false, reason: 'Data pesanan tidak ditemukan' };

  if (order.status_pengiriman === 'retur') {
    return { eligible: false, reason: 'Pesanan ini sudah berstatus retur' };
  }

  if (order.status_pengiriman !== 'terkirim') {
    return {
      eligible: false,
      reason: 'Retur hanya dapat diajukan setelah paket berhasil diantar (status Terkirim)',
    };
  }

  // Waktu referensi: updated_at saat paket diantar, atau created_at
  const referenceTime = new Date(order.updated_at || order.created_at).getTime();
  const now = Date.now();
  const diffHours = (now - referenceTime) / (1000 * 60 * 60);
  const maxHours = 48; // Batas 2 hari

  if (diffHours > maxHours) {
    return {
      eligible: false,
      reason: 'Batas waktu retur telah berakhir (Maksimal 2 hari setelah paket diterima)',
      remainingHours: 0,
      deadlineDate: new Date(referenceTime + maxHours * 60 * 60 * 1000),
    };
  }

  const remainingHours = Math.max(0, Math.ceil(maxHours - diffHours));
  return {
    eligible: true,
    remainingHours,
    deadlineDate: new Date(referenceTime + maxHours * 60 * 60 * 1000),
    reason: `Dapat diajukan retur (Sisa waktu: ${remainingHours} jam lagi)`,
  };
}
