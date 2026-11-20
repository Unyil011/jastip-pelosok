import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { villageService } from '../services/villageService';
import { orderService } from '../services/orderService';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import SkeletonLoader from '../components/SkeletonLoader';

export default function CreateOrder() {
  const navigate = useNavigate();
  const { profile, isProfileComplete } = useAuth();

  // Guard: Jika data profil belum lengkap, paksa kembali ke dashboard customer untuk melengkapi data
  useEffect(() => {
    if (profile && profile.role === 'customer' && !isProfileComplete) {
      navigate('/dashboard-customer', { replace: true });
    }
  }, [profile, isProfileComplete, navigate]);

  // State Form
  const [jenisBarang, setJenisBarang] = useState('paket_ekspedisi'); // 'paket_ekspedisi' | 'titip_beli'
  const [nomorResi, setNomorResi] = useState('');
  const [deskripsiBarang, setDeskripsiBarang] = useState('');
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [alamatDetail, setAlamatDetail] = useState(profile?.alamat || '');
  const [metodePembayaran, setMetodePembayaran] = useState('COD'); // 'COD' | 'transfer'

  // Data Desa
  const [desaList, setDesaList] = useState([]);
  const [loadingDesa, setLoadingDesa] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // BottomSheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState('success');
  const [sheetMessage, setSheetMessage] = useState('');

  // Load daftar desa dari database
  useEffect(() => {
    async function loadDesa() {
      try {
        const data = await villageService.getAllDesa();
        setDesaList(data);
      } catch (err) {
        console.error('Gagal memuat desa:', err);
      } finally {
        setLoadingDesa(false);
      }
    }
    loadDesa();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDesaId) {
      setSheetType('error');
      setSheetMessage('Silakan pilih desa tujuan pengiriman.');
      setSheetOpen(true);
      return;
    }

    // Temukan data desa yang dipilih
    const chosenDesa = desaList.find((d) => d.id === selectedDesaId);
    if (!chosenDesa) {
      setSheetType('error');
      setSheetMessage('Silakan pilih desa tujuan pengiriman.');
      setSheetOpen(true);
      return;
    }

    setSubmitting(true);

    try {
      const fullAddress = `${alamatDetail.trim()}, Desa ${chosenDesa.nama_desa}`;

      await orderService.createOrderByCustomer({
        customerId: profile.id,
        jalurId: null, // Admin di hub yang menentukan pembagian jalur antaran
        jenisBarang,
        nomorResi,
        deskripsiBarang: jenisBarang === 'paket_ekspedisi' ? (deskripsiBarang || 'Paket Ekspedisi') : deskripsiBarang,
        metodePembayaran,
        alamatTujuan: fullAddress,
      });

      setSheetType('success');
      setSheetMessage('Order berhasil dibuat! Pesanan Anda sedang menunggu konfirmasi admin.');
      setSheetOpen(true);
    } catch (err) {
      setSheetType('error');
      setSheetMessage(err.message || 'Gagal menyimpan order. Silakan coba lagi.');
      setSheetOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSheetClose = () => {
    setSheetOpen(false);
    if (sheetType === 'success') {
      navigate('/riwayat-order');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
          Buat Order Baru 📦
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Titip pengiriman paket dari ekspedisi atau titip belanja
        </p>
      </div>

      {loadingDesa ? (
        <SkeletonLoader type="card" height="320px" />
      ) : (
        <Card>
          <form onSubmit={handleSubmit}>
            {/* Toggle Jenis Barang (Skeuomorphic Segmented Control) */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Jenis Layanan Barang <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>

              <div
                style={{
                  display: 'flex',
                  background: 'var(--color-bg-input)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px',
                  boxShadow: 'var(--skeuo-input-sunken)',
                  gap: '4px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setJenisBarang('paket_ekspedisi')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background:
                      jenisBarang === 'paket_ekspedisi'
                        ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                        : 'transparent',
                    color:
                      jenisBarang === 'paket_ekspedisi'
                        ? 'var(--color-primary-dark)'
                        : 'var(--color-text-muted)',
                    boxShadow:
                      jenisBarang === 'paket_ekspedisi'
                        ? '0 2px 5px rgba(20, 35, 28, 0.15)'
                        : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  📦 Paket Ekspedisi
                </button>

                <button
                  type="button"
                  onClick={() => setJenisBarang('titip_beli')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    background:
                      jenisBarang === 'titip_beli'
                        ? 'linear-gradient(180deg, #ffffff 0%, #eef3f0 100%)'
                        : 'transparent',
                    color:
                      jenisBarang === 'titip_beli'
                        ? 'var(--color-primary-dark)'
                        : 'var(--color-text-muted)',
                    boxShadow:
                      jenisBarang === 'titip_beli'
                        ? '0 2px 5px rgba(20, 35, 28, 0.15)'
                        : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  🛒 Titip Beli
                </button>
              </div>
            </div>

            {/* Input khusus Paket Ekspedisi */}
            {jenisBarang === 'paket_ekspedisi' && (
              <Input
                label="Nomor Resi Ekspedisi"
                placeholder="Contoh: JP123456789 / JNT..."
                value={nomorResi}
                onChange={(e) => setNomorResi(e.target.value)}
                helperText="Masukkan nomor resi dari kurir pusat (J&T, SiCepat, Shopee, dll)"
                required
              />
            )}

            {/* Input Deskripsi Barang */}
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  display: 'block',
                  marginBottom: '6px',
                }}
              >
                {jenisBarang === 'paket_ekspedisi' ? 'Catatan / Keterangan Barang' : 'Daftar Barang Titip Beli'}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder={
                  jenisBarang === 'paket_ekspedisi'
                    ? 'Misal: Paket pakaian atas nama Budi'
                    : 'Tuliskan daftar belanjaan, merk, dan jumlah barang'
                }
                value={deskripsiBarang}
                onChange={(e) => setDeskripsiBarang(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(82, 99, 90, 0.22)',
                  background: 'var(--color-bg-input)',
                  boxShadow: 'var(--skeuo-input-sunken)',
                  fontSize: '14.5px',
                  fontFamily: 'inherit',
                  color: 'var(--color-text-main)',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Dropdown Desa Tujuan */}
            <Select
              label="Desa Tujuan Pengantaran"
              placeholder="-- Pilih Desa Tujuan --"
              required
              value={selectedDesaId}
              onChange={(e) => setSelectedDesaId(e.target.value)}
              options={desaList.map((d) => ({
                value: d.id,
                label: `Desa ${d.nama_desa}`,
              }))}
              helperText="Jalur kurir akan otomatis ditentukan sesuai desa ini"
            />

            {/* Alamat Lengkap */}
            <Input
              label="Detail Alamat Tujuan (Dusun / RT / RW)"
              placeholder="Contoh: Dusun Krajan RT 02 RW 01 (Dekat Masjid)"
              value={alamatDetail}
              onChange={(e) => setAlamatDetail(e.target.value)}
              required
            />

            {/* Metode Pembayaran */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Metode Pembayaran Ongkir <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: '10px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(82, 99, 90, 0.2)',
                    background:
                      metodePembayaran === 'COD'
                        ? 'linear-gradient(180deg, #d8ece0 0%, #c5e4d0 100%)'
                        : 'var(--color-bg-card)',
                    boxShadow:
                      metodePembayaran === 'COD'
                        ? 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 4px rgba(20,35,28,0.08)'
                        : 'var(--skeuo-button-raised)',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--color-text-main)',
                  }}
                >
                  <input
                    type="radio"
                    name="metodePembayaran"
                    value="COD"
                    checked={metodePembayaran === 'COD'}
                    onChange={() => setMetodePembayaran('COD')}
                  />
                  💵 Bayar COD (Saat Tiba)
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(82, 99, 90, 0.2)',
                    background:
                      metodePembayaran === 'transfer'
                        ? 'linear-gradient(180deg, #d8ece0 0%, #c5e4d0 100%)'
                        : 'var(--color-bg-card)',
                    boxShadow:
                      metodePembayaran === 'transfer'
                        ? 'inset 0 1px 1px rgba(255,255,255,0.8), 0 2px 4px rgba(20,35,28,0.08)'
                        : 'var(--skeuo-button-raised)',
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: '600',
                    color: 'var(--color-text-main)',
                  }}
                >
                  <input
                    type="radio"
                    name="metodePembayaran"
                    value="transfer"
                    checked={metodePembayaran === 'transfer'}
                    onChange={() => setMetodePembayaran('transfer')}
                  />
                  🏦 Transfer Bank / DANA
                </label>
              </div>
            </div>

            <Button type="submit" loading={submitting}>
              Kirim Order Titipan
            </Button>
          </form>
        </Card>
      )}

      {/* Bottom Sheet Feedback */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={handleSheetClose}
        title={sheetType === 'success' ? 'Sukses' : 'Pemberitahuan'}
      >
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>
            {sheetType === 'success' ? '✅' : '⚠️'}
          </div>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {sheetMessage}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button variant={sheetType === 'success' ? 'primary' : 'outline'} onClick={handleSheetClose}>
              {sheetType === 'success' ? 'Lihat Riwayat Order' : 'Tutup'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
