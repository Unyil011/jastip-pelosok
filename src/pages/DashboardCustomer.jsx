import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
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

  // State Saving
  const [savingProfile, setSavingProfile] = useState(false);

  // Data 11 Desa Pelosok
  const [desaList, setDesaList] = useState([]);

  useEffect(() => {
    async function loadDesa() {
      try {
        const list = await villageService.getAllDesa();
        setDesaList(list);
      } catch (err) {
        console.error('Gagal mengambil daftar desa:', err);
      }
    }
    loadDesa();
  }, []);

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

    // Cek format angka biasa: -7.12345, 107.12345
    const matchSimple = text.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (matchSimple) {
      setLatitude(parseFloat(matchSimple[1]));
      setLongitude(parseFloat(matchSimple[2]));
      return;
    }

    // Cek format URL: ?q=-7.123,107.123 atau @-7.123,107.123
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
        jalurId: chosenDesa?.jalur_id || null,
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

  const handleCreateOrderClick = () => {
    if (!isProfileComplete) {
      showNotice('Silakan lengkapi nomor WhatsApp dan alamat rumah Anda terlebih dahulu sebelum membuat pesanan.');
      setProfileSheetOpen(true);
      return;
    }
    navigate('/buat-order');
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
      {/* Top Bar Melayang Berbentuk Kapsul di Tengah Atas (Floating Capsule) */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto 16px auto',
          background: 'var(--color-bg-card)',
          borderRadius: '999px',
          padding: '6px 8px 6px 14px',
          boxShadow: 'var(--skeuo-button-raised), 0 4px 18px rgba(0, 0, 0, 0.08)',
          border: '1.5px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Brand Kiri di Kapsul */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.webp"
            alt="Logo Jastip Pelosok"
            style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '14.5px', fontWeight: '800', color: 'var(--color-primary-dark)', letterSpacing: '-0.3px' }}>
            Jastip Pelosok
          </span>
        </div>

        {/* Avatar Profil Kanan di Kapsul (Klik untuk Buka Drawer dari Kanan) */}
        <button
          onClick={() => setSidebarOpen(true)}
          title="Buka Menu & Pengaturan"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {profile?.foto_url ? (
            <img
              src={profile.foto_url}
              alt={profile?.nama || 'Profil'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-primary)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            />
          ) : (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                color: '#ffffff',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: 'var(--skeuo-button-raised)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '15px',
              }}
            >
              {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'C'}
            </div>
          )}
        </button>
      </div>

      {/* Top Welcome Banner Card (Dengan Foto Profil Pengguna di Samping Tulisan Halo) */}
      <Card
        style={{
          background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary-dark) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          padding: '20px',
          boxShadow: 'var(--skeuo-button-raised)',
        }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          {/* Foto Profil Pengguna */}
          {profile?.foto_url ? (
            <img
              src={profile.foto_url}
              alt={profile?.nama || 'Foto Profil'}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid rgba(255, 255, 255, 0.75)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
              }}
            />
          ) : (
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.25)',
                border: '2px solid rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: '800',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}
            >
              {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'C'}
            </div>
          )}

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
                Customer
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
                  ✓ Alamat Lengkap
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
            <p style={{ fontSize: '12.5px', opacity: 0.9, marginTop: '3px' }}>
              {profile?.no_hp ? `📱 WA: ${profile.no_hp}` : 'Nomor WhatsApp belum diisi'}
            </p>
          </div>
        </div>
      </Card>

      {/* Warning Card: Jika Data Alamat Belum Lengkap */}
      {!isProfileComplete ? (
        <Card
          style={{
            marginTop: '14px',
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
                Sebelum bisa membuat pesanan jastip / kirim barang, mohon lengkapi nomor WhatsApp, foto, dan alamat rumah Anda terlebih dahulu.
              </p>
              <div style={{ marginTop: '12px' }}>
                <Button size="sm" onClick={() => setProfileSheetOpen(true)}>
                  ✍️ Lengkapi Data Sekarang
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        /* Card Alamat Tersimpan & Titik GPS (Jika Sudah Lengkap) */
        <Card
          style={{
            marginTop: '14px',
            marginBottom: '16px',
            background: 'var(--color-bg-base)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, paddingRight: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Alamat Rumah Pengiriman
              </span>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                {profile?.alamat}
              </p>

              {/* Status Titik GPS Maps */}
              {profile?.latitude && profile?.longitude ? (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11.5px', color: '#16a34a', fontWeight: '700' }}>
                    📍 Titik Koordinat GPS Tersimpan
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '11.5px', color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'underline' }}
                  >
                    (Cek Maps)
                  </a>
                </div>
              ) : (
                <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#d97706', fontWeight: '600' }}>
                  📍 Titik GPS belum diatur (Kurir butuh patokan manual)
                </div>
              )}
            </div>

            <button
              onClick={() => setProfileSheetOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                padding: '4px 8px',
                textDecoration: 'underline',
              }}
            >
              Ubah
            </button>
          </div>
        </Card>
      )}

      {/* Quick Action Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <Card
          onClick={handleCreateOrderClick}
          padding="16px"
          style={{
            cursor: 'pointer',
            textAlign: 'center',
            position: 'relative',
            opacity: isProfileComplete ? 1 : 0.85,
            border: isProfileComplete ? '1px solid var(--color-border)' : '1px dashed var(--color-border)',
          }}
        >
          {!isProfileComplete && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                fontSize: '10px',
                fontWeight: '700',
                background: '#f59e0b',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '999px',
              }}
            >
              🔒 Butuh Alamat
            </div>
          )}
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>➕</div>
          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
            Buat Order Baru
          </h4>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Titip resi ekspedisi / belanjaan
          </p>
        </Card>

        <Card
          onClick={() => navigate('/riwayat-order')}
          padding="16px"
          style={{ cursor: 'pointer', textAlign: 'center' }}
        >
          <div style={{ fontSize: '32px', marginBottom: '6px' }}>📋</div>
          <h4 style={{ fontSize: '14.5px', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
            Riwayat Titipan
          </h4>
          <p style={{ fontSize: '11.5px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Pantau status kiriman Anda
          </p>
        </Card>
      </div>

      {/* Info Card: Cara Kerja Jastip Pelosok */}
      <Card title="Cara Kerja Jastip Pelosok" subtitle="Belanja & paket aman sampai pelosok desa">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: 'var(--color-text-main)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>1️⃣</span>
            <div>
              <b>Input Resi / Titip Beli:</b> Masukkan nomor resi paket dari Shopee/Tokopedia atau daftar belanjaan pasar.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>2️⃣</span>
            <div>
              <b>Disortir di Hub Kecamatan:</b> Petugas admin memeriksa dan mengelompokkan paket sesuai jalur desa.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>3️⃣</span>
            <div>
              <b>Kurir Mengantar ke Rumah:</b> Kurir lokal melihat rute di Maps dan membawa paket langsung ke rumah Anda.
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Sheet: Form Lengkapi / Ubah Profil, Foto & Titik GPS */}
      <BottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title={isProfileComplete ? 'Edit Profil & Alamat' : 'Lengkapi Data Customer'}
      >
        <div style={{ padding: '4px 0 20px 0' }}>
          <form onSubmit={handleSaveProfile}>
            {/* Bagian 1: Upload / Ganti Foto Profil (Otomatis Kompres WebP) */}
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
                  fontSize: '12.5px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {compressingFoto ? 'Mengompres foto ke WebP...' : '📷 Pilih / Ganti Foto Wajah (WebP Ringan)'}
              </button>
              <span style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                Otomatis dikompres ringan untuk hemat kuota
              </span>
            </div>

            {/* Bagian 2: Data Akun */}
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

            {/* Bagian 3: Titik Koordinat GPS Rumah untuk Kurir (Bisa Otomatis & Manual) */}
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

              {/* Tombol 1: GPS HP Otomatis */}
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

              {/* Tombol Toggle Mode Manual */}
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

              {/* Form Input Koordinat Manual / Tempel Link Google Maps */}
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

              {/* Status Koordinat Terisi */}
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

      {/* Drawer Sidebar Menu Kanan (Pengaturan, Tema, Navigasi, Logout) */}
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
