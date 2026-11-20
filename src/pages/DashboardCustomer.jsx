import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { orderService } from '../services/orderService';
import { villageService } from '../services/villageService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import { compressImageToWebP } from '../utils/imageCompressor';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import BottomNav from '../components/BottomNav';
import BottomSheet from '../components/BottomSheet';
import ConfirmationSheet from '../components/ConfirmationSheet';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

export default function DashboardCustomer() {
  const navigate = useNavigate();
  const { profile, refreshProfile, isProfileComplete } = useAuth();
  const fileInputRef = useRef(null);

  // Sidebar & Modal States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [noticeSheetOpen, setNoticeSheetOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  // Active Order Live Tracking State
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  // State Form Profil, Foto & Alamat
  const [name, setName] = useState(profile?.nama || '');
  const [phone, setPhone] = useState(profile?.no_hp || '');
  const [fotoUrl, setFotoUrl] = useState(profile?.foto_url || '');
  const [compressingFoto, setCompressingFoto] = useState(false);
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [kampung, setKampung] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [patokan, setPatokan] = useState('');

  // State Titik Koordinat GPS (Bisa GPS Otomatis & Manual)
  const [latitude, setLatitude] = useState(profile?.latitude || '');
  const [longitude, setLongitude] = useState(profile?.longitude || '');
  const [fetchingGps, setFetchingGps] = useState(false);
  const [manualCoordMode, setManualCoordMode] = useState(false);
  const [pastedMapText, setPastedMapText] = useState('');

  // State Kalkulator Ongkir Cepat
  const [calcDesaId, setCalcDesaId] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Data 11 Desa Pelosok
  const [desaList, setDesaList] = useState([]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const list = await villageService.getAllDesa();
        setDesaList(list);

        if (profile?.id) {
          const orders = await orderService.getOrdersByCustomerId(profile.id);
          const active = orders.find(
            (o) => o.status_pengiriman !== 'sampai_tujuan' && o.status_konfirmasi !== 'ditolak'
          );
          setActiveOrder(active || null);
        }
      } catch (err) {
        console.error('Gagal memuat data awal:', err);
      } finally {
        setLoadingOrder(false);
      }
    }
    loadInitialData();
  }, [profile?.id]);

  // Sinkronisasi data saat profil diperbarui
  useEffect(() => {
    if (profile) {
      if (profile.nama && !name) setName(profile.nama);
      if (profile.no_hp && !phone) setPhone(profile.no_hp);
      if (profile.foto_url) setFotoUrl(profile.foto_url);
      if (profile.latitude) setLatitude(profile.latitude);
      if (profile.longitude) setLongitude(profile.longitude);
    }
  }, [profile]);

  // Handler Pilih & Kompres Foto Profil ke WebP
  const handleFotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCompressingFoto(true);
    try {
      const webpBase64 = await compressImageToWebP(file, 300, 0.8);
      setFotoUrl(webpBase64);
    } catch (err) {
      showNotice(err.message || 'Gagal memproses foto. Silakan coba gambar lain.');
    } finally {
      setCompressingFoto(false);
    }
  };

  // Handler Ambil Titik Koordinat GPS Rumah Otomatis
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      showNotice('Fitur GPS tidak didukung di browser ini. Anda bisa mengisinya manual di bawah.');
      setManualCoordMode(true);
      return;
    }

    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setFetchingGps(false);
      },
      (error) => {
        setFetchingGps(false);
        let msg = 'Gagal mendeteksi lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Izin akses lokasi ditolak. Silakan masukkan koordinat secara manual atau tempel link Google Maps.';
        }
        showNotice(msg);
        setManualCoordMode(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Handler Parse Link atau Teks Koordinat Google Maps
  const handleParseMapText = (text) => {
    setPastedMapText(text);
    if (!text) return;

    const matchSimple = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (matchSimple) {
      setLatitude(parseFloat(matchSimple[1]));
      setLongitude(parseFloat(matchSimple[2]));
      return;
    }

    const matchUrl = text.match(/[@?&]q?=?(-?\d+\.\d+)[,/](-?\d+\.\d+)/);
    if (matchUrl) {
      setLatitude(parseFloat(matchUrl[1]));
      setLongitude(parseFloat(matchUrl[2]));
    }
  };

  // Handler Simpan Profil, Foto & Alamat
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      showNotice('Nama lengkap wajib diisi.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showNotice('Nomor WhatsApp / HP tidak valid (minimal 10 digit).');
      return;
    }

    if (!selectedDesaId) {
      showNotice('Silakan pilih Desa tempat tinggal Anda.');
      return;
    }

    if (!kampung.trim()) {
      showNotice('Nama Kampung / Dusun wajib diisi.');
      return;
    }

    if (!rt.trim() || !rw.trim()) {
      showNotice('Nomor RT dan RW wajib diisi.');
      return;
    }

    const chosenDesa = desaList.find((d) => d.id === selectedDesaId);
    const namaDesa = chosenDesa ? chosenDesa.nama_desa : '';

    let formattedAddress = `Kp. ${kampung.trim()}, RT ${rt.trim().padStart(2, '0')}/RW ${rw.trim().padStart(2, '0')}, Desa ${namaDesa}`;
    if (patokan.trim()) {
      formattedAddress += ` (Patokan: ${patokan.trim()})`;
    }

    setSavingProfile(true);

    try {
      await authService.updateCustomerProfile(profile.id, {
        name: name.trim(),
        phone: cleanPhone,
        address: formattedAddress,
        fotoUrl: fotoUrl || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });

      await refreshProfile();
      setProfileSheetOpen(false);
      showNotice('Data profil, foto, alamat & titik GPS berhasil disimpan!');
    } catch (err) {
      showNotice(getFriendlyErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const showNotice = (msg) => {
    setNoticeMessage(msg);
    setNoticeSheetOpen(true);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="app-container" style={{ paddingBottom: '90px', paddingTop: '8px' }}>
      {/* 1. Top Bar Kapsul Melayang (Konsisten Menampilkan Logo & Foto Profil Pengguna) */}
      <TopBar onOpenProfile={() => setSidebarOpen(true)} />

      {/* 2. Banner Sambutan Hijau (Tanpa Foto Dobel, Menampilkan Maskot Antaran 🛵) */}
      <Card
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-dark) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '20px',
          boxShadow: 'var(--skeuo-button-raised)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {/* Ikon Pengiriman Maskot 3D (Bukan Foto Pengguna Lagi agar Tidak Dobel) */}
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.45)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            🛵
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                }}
              >
                Pelanggan Setia
              </span>
              {isProfileComplete ? (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: '#22c55e',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  ✓ Alamat Siap
                </span>
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    background: '#f59e0b',
                    color: '#ffffff',
                    padding: '2px 8px',
                    borderRadius: '999px',
                  }}
                >
                  ⚠️ Belum Lengkap
                </span>
              )}
            </div>

            <h2
              style={{
                fontSize: '19px',
                fontWeight: '800',
                margin: '2px 0 0 0',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Halo, {profile?.nama || 'Pelanggan'}! 👋
            </h2>
            <p style={{ fontSize: '12px', opacity: 0.9, marginTop: '3px' }}>
              {profile?.alamat ? `📍 ${profile.alamat.split('(')[0]}` : 'Alamat rumah belum diatur'}
            </p>
          </div>
        </div>
      </Card>

      {/* Peringatan Jika Data Alamat Belum Lengkap */}
      {!isProfileComplete && (
        <Card
          style={{
            marginBottom: '16px',
            border: '2px dashed #f59e0b',
            background: 'rgba(245, 158, 11, 0.08)',
          }}
        >
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
                Lengkapi Alamat Pengiriman Anda
              </h4>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                Sebelum bisa membuat pesanan jastip / kirim barang, mohon lengkapi nomor WhatsApp dan alamat rumah Anda terlebih dahulu.
              </p>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" onClick={() => setProfileSheetOpen(true)}>
                  ✍️ Lengkapi Data Sekarang
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 3. KONTEN UTAMA: Live Status & Pelacakan Paket ala Shopee */}
      {activeOrder ? (
        <Card
          title="Pelacakan Pengiriman Langsung"
          subtitle="Pantau posisi dan status kurir menuju rumah Anda"
          style={{ marginBottom: '16px', border: '1.5px solid var(--color-primary)' }}
        >
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)', textTransform: 'uppercase' }}>
                {activeOrder.jenis_barang === 'paket_ekspedisi' ? '📦 PAKET EKSPEDISI' : '🛒 TITIP BELI'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                }}
              >
                {activeOrder.status_pengiriman === 'diantar'
                  ? '🛵 Sedang Diantar'
                  : activeOrder.status_pengiriman === 'diterima_hub'
                  ? '🏢 Di Hub Kecamatan'
                  : '⏳ Menunggu di Hub'}
              </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '6px 0 2px 0', color: 'var(--color-text-main)' }}>
              {activeOrder.nomor_resi ? `Resi: ${activeOrder.nomor_resi}` : activeOrder.deskripsi_barang}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
              Tujuan: {activeOrder.alamat_tujuan}
            </p>
          </div>

          {/* Simulasi Peta Live Tracking Sederhana & Ringan */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              boxShadow: 'var(--skeuo-input-sunken)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', margin: '8px 0 14px 0' }}>
              <div>
                <div style={{ fontSize: '24px' }}>🏢</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-dim)' }}>Hub Kecamatan</span>
              </div>
              <div style={{ flex: 1, height: '2px', background: 'var(--color-primary)', margin: '0 8px', position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: activeOrder.status_pengiriman === 'diantar' ? '65%' : '20%',
                    fontSize: '16px',
                    transition: 'left 0.5s ease',
                  }}
                >
                  🛵
                </span>
              </div>
              <div>
                <div style={{ fontSize: '24px' }}>🏠</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>Rumah Anda</span>
              </div>
            </div>

            <p style={{ fontSize: '12.5px', color: 'var(--color-text-main)', margin: '4px 0 12px 0', fontWeight: '600' }}>
              {activeOrder.status_pengiriman === 'diantar'
                ? '🛵 Kurir sedang membawa paket menuju ke alamat Anda!'
                : '🏢 Paket Anda sudah aman di hub kecamatan dan siap diantar kurir.'}
            </p>

            {profile?.latitude && profile?.longitude && (
              <a
                href={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                }}
              >
                🗺️ Buka Rute Rumah di Google Maps
              </a>
            )}
          </div>
        </Card>
      ) : (
        /* Status Santai Jika Belum Ada Paket yang Sedang Diantar */
        <Card style={{ marginBottom: '16px', textAlign: 'center', padding: '24px 18px' }}>
          <div style={{ fontSize: '42px', marginBottom: '8px' }}>📦</div>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
            Tidak Ada Paket yang Sedang Berjalan
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
            Sedang belanja online di Shopee, Tokopedia, atau TikTok Shop?
            Kirimkan nomor resinya melalui tombol <b>(+)</b> di bawah agar kami jemput ke hub kecamatan!
          </p>
        </Card>
      )}

      {/* 4. Jadwal Operasional Hub & Info Antaran Desa */}
      <Card
        title="Jadwal Antaran Hub Kecamatan"
        subtitle="Waktu sortir dan keberangkatan kurir ke desa"
        style={{ marginBottom: '16px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🕒</span>
            <div>
              <b>Sortir Paket Masuk:</b> Pukul 08.00 – 10.00 WIB
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>🛵</span>
            <div>
              <b>Keberangkatan Kurir:</b> Pagi (10.30 WIB) & Siang (14.30 WIB)
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📍</span>
            <div>
              <b>Wilayah Layanan:</b> Menjangkau 11 Desa Se-Kecamatan Naringgul
            </div>
          </div>
        </div>
      </Card>

      {/* 5. Cek Estimasi Ongkir Cepat Antar Desa */}
      <Card
        title="Cek Tarif Ongkir Antar Desa"
        subtitle="Transparan tanpa biaya tersembunyi"
        style={{ marginBottom: '16px' }}
      >
        <Select
          label="Pilih Desa Tujuan"
          placeholder="-- Pilih Salah Satu Desa --"
          value={calcDesaId}
          onChange={(e) => setCalcDesaId(e.target.value)}
          options={desaList.map((d) => ({
            value: d.id,
            label: `Desa ${d.nama_desa}`,
          }))}
        />

        {calcDesaId && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-base)',
              boxShadow: 'var(--skeuo-input-sunken)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Estimasi Biaya Jastip
              </span>
              <h4 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: '2px 0 0 0' }}>
                Rp 10.000 <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--color-text-muted)' }}>/ paket</span>
              </h4>
            </div>
            <span style={{ fontSize: '11px', fontWeight: '700', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--color-primary)', padding: '4px 8px', borderRadius: '6px' }}>
              Sampai Pintu Rumah
            </span>
          </div>
        )}
      </Card>

      {/* 6. Bantuan Cepat WhatsApp Admin Hub */}
      <Card style={{ textAlign: 'center', padding: '18px' }}>
        <h4 style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0 }}>
          Punya Pertanyaan Seputar Paket?
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '4px 0 12px 0' }}>
          Admin kami siap membantu pengecekan resi belanjaan atau titip beli
        </p>
        <a
          href="https://wa.me/6281234567890?text=Halo%20Admin%20Jastip%20Pelosok,%20saya%20mau%20tanya%20paket"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#25D366',
            color: '#ffffff',
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '13px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
          }}
        >
          <span>💬</span>
          <span>Chat WhatsApp Admin Hub</span>
        </a>
      </Card>

      {/* Bottom Sheet: Form Lengkapi / Ubah Profil, Foto & Titik GPS */}
      <BottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title={isProfileComplete ? 'Edit Profil & Alamat' : 'Lengkapi Data Customer'}
      >
        <div style={{ padding: '4px 0 20px 0' }}>
          <form onSubmit={handleSaveProfile}>
            {/* Foto Profil (Tampilan Bersih dengan Tombol "Ubah Foto Profil") */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginBottom: '18px',
                padding: '12px',
                background: 'var(--color-bg-base)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--skeuo-input-sunken)',
              }}
            >
              <div style={{ position: 'relative', width: '74px', height: '74px', marginBottom: '8px' }}>
                {fotoUrl ? (
                  <img
                    src={fotoUrl}
                    alt="Preview Foto"
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--color-primary)',
                      boxShadow: 'var(--skeuo-button-raised)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '26px',
                      fontWeight: '800',
                      boxShadow: 'var(--skeuo-button-raised)',
                    }}
                  >
                    {name ? name.charAt(0).toUpperCase() : '👤'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Pilih Foto Baru"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    border: '2px solid #ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '13px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}
                >
                  📷
                </button>
              </div>

              {/* Input File Tersembunyi */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFotoChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressingFoto}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-primary)',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  marginTop: '2px',
                }}
              >
                {compressingFoto ? 'Memproses foto...' : 'Ubah Foto Profil'}
              </button>
            </div>

            {/* Data Akun */}
            <Input
              label="Nama Lengkap"
              placeholder="Contoh: Ramon"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Nomor WhatsApp / HP Aktif"
              type="tel"
              placeholder="Contoh: 081234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              helperText="Wajib aktif untuk konfirmasi kurir saat barang tiba"
              required
            />

            <Select
              label="Pilih Desa Tempat Tinggal"
              placeholder="-- Pilih Salah Satu dari 11 Desa --"
              required
              value={selectedDesaId}
              onChange={(e) => setSelectedDesaId(e.target.value)}
              options={desaList.map((d) => ({
                value: d.id,
                label: `Desa ${d.nama_desa}`,
              }))}
            />

            <Input
              label="Nama Kampung / Dusun / Jalan"
              placeholder="Contoh: Kp. Cibeet"
              value={kampung}
              onChange={(e) => setKampung(e.target.value)}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="RT"
                placeholder="Misal: 01"
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                required
              />

              <Input
                label="RW"
                placeholder="Misal: 03"
                value={rw}
                onChange={(e) => setRw(e.target.value)}
                required
              />
            </div>

            {/* Titik Koordinat GPS Rumah untuk Kurir */}
            <div
              style={{
                marginTop: '14px',
                marginBottom: '14px',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
                  📍 TITIK KOORDINAT GPS RUMAH
                </span>
                {latitude && longitude && (
                  <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '700' }}>
                    ✓ Terkunci
                  </span>
                )}
              </div>

              <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                Kurir akan memakai titik ini untuk navigasi Google Maps langsung ke rumah Anda di pelosok.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={fetchingGps}
                onClick={handleGetGpsLocation}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                📍 Ambil Titik Rumah Saya Saat Ini (GPS HP)
              </Button>

              <div style={{ textAlign: 'center', margin: '4px 0 8px 0' }}>
                <button
                  type="button"
                  onClick={() => setManualCoordMode(!manualCoordMode)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  {manualCoordMode ? '▲ Tutup Pengaturan Manual' : '▼ Sedang di luar rumah? Atur titik manual di sini'}
                </button>
              </div>

              {manualCoordMode && (
                <div
                  style={{
                    marginTop: '8px',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-bg-card)',
                    border: '1px dashed var(--color-border)',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-main)', display: 'block', marginBottom: '4px' }}>
                    Tempel Link / Koordinat Google Maps:
                  </span>
                  <input
                    type="text"
                    placeholder="Contoh: -7.4523, 107.5123 atau link Google Maps"
                    value={pastedMapText}
                    onChange={(e) => handleParseMapText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      fontSize: '12px',
                      marginBottom: '10px',
                      background: 'var(--color-bg-base)',
                      color: 'var(--color-text-main)',
                      outline: 'none',
                    }}
                  />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--color-text-dim)' }}>Latitude:</span>
                      <input
                        type="text"
                        placeholder="-7.xxxxx"
                        value={latitude || ''}
                        onChange={(e) => setLatitude(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--color-text-dim)' }}>Longitude:</span>
                      <input
                        type="text"
                        placeholder="107.xxxxx"
                        value={longitude || ''}
                        onChange={(e) => setLongitude(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          background: 'var(--color-bg-base)',
                          color: 'var(--color-text-main)',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: '8px', fontSize: '10.5px', color: 'var(--color-text-muted)' }}>
                    💡 <b>Tips:</b> Buka Google Maps di HP/laptop, tekan lama di titik atap rumah Anda, salin angka koordinatnya lalu tempelkan di sini.
                  </div>
                </div>
              )}

              {latitude && longitude ? (
                <div style={{ fontSize: '12px', color: 'var(--color-text-main)', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📍 {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}</span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'underline' }}
                  >
                    Buka di Maps ↗
                  </a>
                </div>
              ) : (
                <span style={{ fontSize: '11px', color: '#f59e0b', display: 'block', marginTop: '6px' }}>
                  *Titik koordinat belum ditentukan (opsional tapi sangat membantu kurir)
                </span>
              )}
            </div>

            <Input
              label="Catatan / Patokan Lokasi (Opsional)"
              placeholder="Contoh: Dekat sekolah MI / samping pos ronda"
              value={patokan}
              onChange={(e) => setPatokan(e.target.value)}
              helperText="Membantu kurir jika sinyal GPS sempat hilang di pedalaman"
            />

            <div style={{ marginTop: '20px' }}>
              <Button type="submit" loading={savingProfile}>
                Simpan & Konfirmasi Data
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Drawer Sidebar Menu Kanan (Pengaturan Murni & Logout) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAddressModal={() => setProfileSheetOpen(true)}
        onTriggerLogout={() => setLogoutSheetOpen(true)}
      />

      {/* Confirmation Sheet Logout */}
      <ConfirmationSheet
        isOpen={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={handleLogout}
        title="Konfirmasi Keluar"
        message="Apakah Anda yakin ingin keluar dari akun Jastip Pelosok?"
        confirmText="Ya, Keluar"
        confirmVariant="danger"
      />

      {/* General Notification Sheet */}
      <BottomSheet isOpen={noticeSheetOpen} onClose={() => setNoticeSheetOpen(false)} title="Informasi">
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>ℹ️</div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {noticeMessage}
          </p>
          <div style={{ marginTop: '18px' }}>
            <Button variant="outline" onClick={() => setNoticeSheetOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bottom Navigation */}
      <BottomNav role="customer" />
    </div>
  );
}
