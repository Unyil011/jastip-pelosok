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
