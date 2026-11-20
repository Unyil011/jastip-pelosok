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
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import ConfirmationSheet from '../components/ConfirmationSheet';
import { authService } from '../services/authService';

export default function CreateOrder() {
  const navigate = useNavigate();
  const { profile, isProfileComplete } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);

  // Guard: Jika data profil belum lengkap, paksa kembali ke dashboard customer untuk melengkapi data
  useEffect(() => {
    if (profile && profile.role === 'customer' && !isProfileComplete) {
      navigate('/dashboard-customer', { replace: true });
    }
  }, [profile, isProfileComplete, navigate]);

  // State Form
  const [jenisBarang, setJenisBarang] = useState('paket_ekspedisi'); // 'paket_ekspedisi' | 'titip_beli'
  const [jumlahBarang, setJumlahBarang] = useState(1);
  const [nomorResi, setNomorResi] = useState('');
  const [deskripsiBarang, setDeskripsiBarang] = useState('');
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [alamatDetail, setAlamatDetail] = useState(profile?.alamat || '');
  const [metodePembayaran, setMetodePembayaran] = useState('COD'); // 'COD' | 'transfer'
  const [copiedText, setCopiedText] = useState('');

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

  // Otomatis memilih Desa Tujuan sesuai profil alamat pengguna
  useEffect(() => {
    if (desaList.length > 0 && profile?.alamat && !selectedDesaId) {
      const match = desaList.find((d) =>
        profile.alamat.toLowerCase().includes(d.nama_desa.toLowerCase())
      );
      if (match) {
        setSelectedDesaId(match.id);
      }
    }
  }, [desaList, profile?.alamat, selectedDesaId]);

  // Update alamatDetail jika profile baru termuat
  useEffect(() => {
    if (profile?.alamat && !alamatDetail) {
      setAlamatDetail(profile.alamat);
    }
  }, [profile?.alamat, alamatDetail]);

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
      const prefixJumlah = `[${jumlahBarang} ${jenisBarang === 'paket_ekspedisi' ? 'Paket' : 'Barang'}]`;
      const deskripsiFinal = `${prefixJumlah} ${deskripsiBarang.trim() || (jenisBarang === 'paket_ekspedisi' ? 'Paket Ekspedisi' : 'Titip Barang')}`;

      await orderService.createOrderByCustomer({
        customerId: profile.id,
        jalurId: null, // Admin di hub yang menentukan pembagian jalur antaran
        jenisBarang: jenisBarang === 'paket_ekspedisi' ? 'paket_ekspedisi' : 'titip_beli',
        nomorResi,
        deskripsiBarang: deskripsiFinal,
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
    <div className="app-container" style={{ paddingBottom: '90px', paddingTop: '8px' }}>
      {/* Top Bar Kapsul Melayang */}
      <TopBar onOpenProfile={() => setSidebarOpen(true)} />

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
                  🛍️ Titip Barang
                </button>
              </div>
            </div>

            {/* Input khusus Paket Ekspedisi */}
            {jenisBarang === 'paket_ekspedisi' && (
              <Input
                label="Nomor Resi Ekspedisi"
                placeholder="Contoh: JP123456789 / JNT / SPX..."
                value={nomorResi}
                onChange={(e) => setNomorResi(e.target.value)}
                helperText="Masukkan nomor resi dari Shopee, J&T, SiCepat, dll"
                required
              />
            )}

            {/* Input Jumlah Paket / Barang */}
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
                Jumlah {jenisBarang === 'paket_ekspedisi' ? 'Paket' : 'Barang'} <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--color-bg-input)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(82, 99, 90, 0.22)',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    padding: '4px',
                    width: '140px',
                    justifyContent: 'space-between',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setJumlahBarang((prev) => Math.max(1, prev - 1))}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--color-bg-base)',
                      boxShadow: 'var(--skeuo-button-raised)',
                      fontSize: '18px',
                      fontWeight: '800',
                      color: 'var(--color-primary-dark)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                    {jumlahBarang}
                  </span>
                  <button
                    type="button"
                    onClick={() => setJumlahBarang((prev) => prev + 1)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--color-bg-base)',
                      boxShadow: 'var(--skeuo-button-raised)',
                      fontSize: '18px',
                      fontWeight: '800',
                      color: 'var(--color-primary-dark)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    +
                  </button>
                </div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  {jumlahBarang} {jenisBarang === 'paket_ekspedisi' ? 'paket diantar' : 'barang titipan'}
                </span>
              </div>
            </div>

            {/* Input Deskripsi / Catatan Barang */}
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
                {jenisBarang === 'paket_ekspedisi' ? 'Catatan / Keterangan Isi Paket' : 'Daftar Keterangan Barang Titipan'}{' '}
                <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <textarea
                rows={3}
                placeholder={
                  jenisBarang === 'paket_ekspedisi'
                    ? 'Misal: 2 paket baju kaos atas nama Budi'
                    : 'Tuliskan nama barang, jenis belanjaan, dan keterangan toko'
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

            {/* Dropdown Desa Tujuan (Auto-Terpilih dari Profil) */}
            <div style={{ marginBottom: '16px' }}>
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
                helperText={
                  selectedDesaId
                    ? '✓ Otomatis terisi sesuai desa di alamat profil Anda'
                    : 'Pilih desa tujuan pengantaran paket'
                }
              />
            </div>

            {/* Alamat Lengkap */}
            <Input
              label="Detail Alamat Tujuan (Dusun / RT / RW)"
              placeholder="Contoh: Dusun Krajan RT 02 RW 01 (Dekat Masjid)"
              value={alamatDetail}
              onChange={(e) => setAlamatDetail(e.target.value)}
              required
            />

            {/* Metode Pembayaran */}
            <div style={{ marginBottom: '18px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-text-main)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Metode Pembayaran Ongkir & Paket <span style={{ color: 'var(--color-danger)' }}>*</span>
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

              {/* Box Rincian Pembayaran Transfer & Barcode DANA */}
              {metodePembayaran === 'transfer' && (
                <div
                  style={{
                    marginTop: '14px',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg-base)',
                    boxShadow: 'var(--skeuo-input-sunken)',
                    border: '1.5px solid var(--color-primary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📲</span>
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
                        Informasi Barcode & Akun Pembayaran Kurir
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        Nomor dan barcode sesuai rekening resmi pengelola kurir pelosok
                      </span>
                    </div>
                  </div>

                  {/* Simulasi Visual Barcode / QRIS Box */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      background: '#ffffff',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      marginBottom: '12px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '240px',
                        height: '52px',
                        background: 'repeating-linear-gradient(90deg, #111 0, #111 2px, #fff 2px, #fff 4px, #111 4px, #111 7px, #fff 7px, #fff 9px, #111 9px, #111 13px, #fff 13px, #fff 15px, #111 15px, #111 19px, #fff 19px, #fff 21px, #111 21px, #111 26px)',
                        borderRadius: '3px',
                        marginBottom: '6px',
                      }}
                    />
                    <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#1f2937', letterSpacing: '2.5px' }}>
                      * JP-DANA-NARINGGUL-2026 *
                    </span>
                  </div>

                  {/* Nomor Rekening & DANA */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.25)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
                          DANA / E-Wallet:
                        </div>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                          0812-0983-212
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                          a/n Jastip Pelosok (Rival Ram)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText('08120983212');
                          setCopiedText('DANA');
                          setTimeout(() => setCopiedText(''), 2000);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'var(--color-primary)',
                          color: '#fff',
                          border: 'none',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedText === 'DANA' ? '✓ Tersalin!' : 'Salin'}
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '9px 12px',
                        borderRadius: '6px',
                        background: 'var(--color-bg-card)',
                        border: '1px solid var(--color-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>
                          Rekening Bank BRI:
                        </div>
                        <div style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-text-main)' }}>
                          4123-0100-8899-532
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                          a/n Jastip Pelosok
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText('412301008899532');
                          setCopiedText('BRI');
                          setTimeout(() => setCopiedText(''), 2000);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                          border: '1px solid var(--color-border)',
                          fontSize: '11.5px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        {copiedText === 'BRI' ? '✓ Tersalin!' : 'Salin'}
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '10px 0 0 0', lineHeight: '1.4' }}>
                    💡 <i>Harga paket & ongkir akan dikonfirmasi kurir saat pesanan diproses. Anda bisa transfer sesudah kurir memberi tahu nominal pasti.</i>
                  </p>
                </div>
              )}
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

      {/* Drawer Sidebar Menu Kanan */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAddressModal={() => navigate('/dashboard-customer')}
        onTriggerLogout={() => setLogoutSheetOpen(true)}
      />

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={async () => {
          await authService.logout();
          navigate('/login');
        }}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Jastip Pelosok?"
        confirmText="Ya, Keluar"
        confirmVariant="danger"
      />

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
