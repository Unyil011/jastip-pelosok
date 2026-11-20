/**
 * Menerjemahkan pesan error teknis Supabase menjadi Bahasa Indonesia
 * yang jelas dan mudah dipahami oleh pengguna.
 */
export function getFriendlyErrorMessage(error) {
  if (!error) return 'Terjadi kesalahan sistem. Silakan coba lagi.';

  const rawMessage = typeof error === 'string' ? error : error.message || '';
  const lowerMsg = rawMessage.toLowerCase();

  // 1. Error Infinite Recursion pada RLS Policy
  if (lowerMsg.includes('infinite recursion') || lowerMsg.includes('recursion detected')) {
    return 'Terjadi looping izin akses database (RLS). Harap jalankan script SQL perbaikan RLS (Disable RLS pada tabel users) di Supabase SQL Editor.';
  }

  // 2. Error Kolom belum ada di database
  if (lowerMsg.includes('column') && (lowerMsg.includes('does not exist') || lowerMsg.includes('schema cache'))) {
    return `Kolom baru belum dibuat di database (${rawMessage}). Harap jalankan script SQL penambahan kolom di Supabase.`;
  }

  // 3. Error Row-Level Security (RLS)
  if (lowerMsg.includes('row-level security') || lowerMsg.includes('violates row-level security')) {
    return 'Izin akses pada database Supabase belum diatur. Harap jalankan skrip SQL izin akses di SQL Editor.';
  }

  // 4. Error Nomor HP / Email Duplikat
  if (
    lowerMsg.includes('user already registered') ||
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('users_no_hp_key') ||
    lowerMsg.includes('unique constraint')
  ) {
    return 'Nomor HP ini sudah terdaftar sebelumnya. Silakan gunakan nomor lain atau langsung masuk ke halaman Login.';
  }

  // 5. Error Format Kata Sandi Kurang
  if (lowerMsg.includes('password should be at least') || lowerMsg.includes('password is too short')) {
    return 'Kata sandi terlalu pendek. Harap masukkan minimal 6 karakter.';
  }

  // 6. Error Batas Waktu (Rate Limit)
  if (lowerMsg.includes('rate limit') || lowerMsg.includes('too many requests')) {
    return 'Terlalu banyak percobaan dalam waktu singkat. Harap tunggu 1–2 menit sebelum mencoba lagi.';
  }

  // 7. Error Jaringan
  if (lowerMsg.includes('failed to fetch') || lowerMsg.includes('network error')) {
    return 'Koneksi internet bermasalah. Harap periksa jaringan internet Anda dan coba lagi.';
  }

  return rawMessage || 'Data belum dapat diproses. Harap periksa kembali kelengkapan formulir Anda.';
}
