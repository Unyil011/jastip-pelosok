import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { villageService } from '../services/villageService';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
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

  // Sidebar & Modal States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const [noticeSheetOpen, setNoticeSheetOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState('');

  // State Form Kelengkapan Profil
  const [name, setName] = useState(profile?.nama || '');
  const [phone, setPhone] = useState(profile?.no_hp || '');
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [kampung, setKampung] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [patokan, setPatokan] = useState('');
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

  // Sinkronisasi data awal jika profil berubah
  useEffect(() => {
    if (profile) {
      if (profile.nama && !name) setName(profile.nama);
      if (profile.no_hp && !phone) setPhone(profile.no_hp);
    }
  }, [profile]);

  // Handler Simpan Profil & Alamat
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
      });

      await refreshProfile();
      setProfileSheetOpen(false);
      showNotice('Data profil & alamat pengiriman Anda berhasil disimpan!');
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
    <div className="app-container" style={{ paddingBottom: '90px' }}>
      {/* Top Bar Navigasi dengan Tombol Hamburger Sidebar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 0 14px 0',
        }}
      >
        {/* Tombol Hamburger Sidebar */}
        <button
          onClick={() => setSidebarOpen(true)}
          title="Buka Menu Pengaturan & Sidebar"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--skeuo-button-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            cursor: 'pointer',
            color: 'var(--color-primary-dark)',
            transition: 'transform 0.15s ease',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          ☰
        </button>

        {/* Brand App di Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.webp"
            alt="Logo Jastip Pelosok"
            style={{ width: '28px', height: '28px', borderRadius: '8px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--color-primary-dark)', letterSpacing: '-0.3px' }}>
            Jastip Pelosok
          </span>
        </div>

        {/* Profil Trigger */}
        <button
          onClick={() => setSidebarOpen(true)}
          title="Buka Profil & Pengaturan"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: 'var(--skeuo-button-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '15px',
            cursor: 'pointer',
          }}
        >
          {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'C'}
        </button>
      </div>

      {/* Top Welcome Banner Card (Bersih & Rapi Tanpa Tombol yang Menumpuk) */}
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
          <img
            src="/logo.webp"
            alt="Logo Jastip Pelosok"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              objectFit: 'contain',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1.5px solid rgba(255, 255, 255, 0.4)',
              padding: '2px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            }}
          />
          <div style={{ flex: 1 }}>
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

            <h2 style={{ fontSize: '19px', fontWeight: '800', margin: '2px 0 0 0' }}>
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
      ) : (
        /* Card Alamat Tersimpan (Jika Sudah Lengkap) */
        <Card
          style={{
            marginTop: '14px',
            marginBottom: '16px',
            background: 'var(--color-bg-base)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                Alamat Rumah Pengiriman
              </span>
              <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)', marginTop: '4px', lineHeight: '1.4' }}>
                {profile?.alamat}
              </p>
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
              <b>Kurir Mengantar ke Rumah:</b> Kurir lokal membawa paket langsung ke alamat rumah Anda di pelosok.
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom Sheet: Form Lengkapi / Ubah Alamat Profil */}
      <BottomSheet
        isOpen={profileSheetOpen}
        onClose={() => setProfileSheetOpen(false)}
        title={isProfileComplete ? 'Ubah Data Alamat' : 'Lengkapi Data Customer'}
      >
        <div style={{ padding: '4px 0 16px 0' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>
            Data ini digunakan oleh kurir lokal untuk mengonfirmasi dan mengantar paket ke rumah Anda.
          </p>

          <form onSubmit={handleSaveProfile}>
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

            <Input
              label="Catatan / Patokan Lokasi (Opsional)"
              placeholder="Contoh: Dekat sekolah MI / samping pos ronda"
              value={patokan}
              onChange={(e) => setPatokan(e.target.value)}
              helperText="Membantu kurir menemukan rumah Anda lebih cepat"
            />

            <div style={{ marginTop: '20px' }}>
              <Button type="submit" loading={savingProfile}>
                Simpan & Konfirmasi Data
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Drawer Sidebar Menu Samping (Pengaturan, Tema, Navigasi, Logout) */}
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
