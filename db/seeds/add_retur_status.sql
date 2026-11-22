-- Migration script to add 'retur' to delivery_status enum in Supabase
-- Jalankan skrip ini di Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Tambahkan nilai 'retur' ke tipe enum delivery_status jika belum ada
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'retur';

-- Catatan:
-- Nilai enum yang ada sebelumnya: 'dipesan', 'diterima_hub', 'dalam_perjalanan', 'terkirim'
-- Dengan menambahkan 'retur', sistem Jastip Pelosok kini mendukung penanganan paket yang diretur/dikembalikan.
