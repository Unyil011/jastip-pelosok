import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { villageService } from '../services/villageService';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import SkeletonLoader from '../components/SkeletonLoader';

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  // Data Akun
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  // Data Alamat Terpisah
  const [kampung, setKampung] = useState('');
  const [rt, setRt] = useState('');
  const [rw, setRw] = useState('');
  const [selectedDesaId, setSelectedDesaId] = useState('');
  const [patokan, setPatokan] = useState('');

  // Data Desa dari database
  const [desaList, setDesaList] = useState([]);
  const [loadingDesa, setLoadingDesa] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // BottomSheet Notifikasi
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMessage, setSheetMessage] = useState('');

  useEffect(() => {
    async function loadDesa() {
      try {
        const data = await villageService.getAllDesa();
        setDesaList(data);
      } catch (err) {
        console.error('Gagal mengambil daftar desa:', err);
      } finally {
        setLoadingDesa(false);
      }
    }
    loadDesa();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validasi Ketat: Tidak boleh ada yang kosong
    if (!name.trim()) {
      showError('Nama lengkap wajib diisi.');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      showError('Nomor WhatsApp / HP tidak valid (minimal 10 digit angka).');
      return;
    }

    if (password.length < 6) {
      showError('Kata sandi minimal 6 karakter.');
      return;
    }

    if (!kampung.trim()) {
      showError('Nama Kampung / Dusun / Jalan wajib diisi.');
      return;
    }

    if (!rt.trim()) {
      showError('Nomor RT wajib diisi (misal: 01).');
      return;
    }

    if (!rw.trim()) {
      showError('Nomor RW wajib diisi (misal: 02).');
      return;
    }

    if (!selectedDesaId) {
      showError('Silakan pilih Desa tempat tinggal Anda.');
      return;
    }

    const selectedDesa = desaList.find((d) => d.id === selectedDesaId);
    const namaDesa = selectedDesa ? selectedDesa.nama_desa : '';

    // Susun format alamat lengkap terstruktur
    let formattedAddress = `Kp. ${kampung.trim()}, RT ${rt.trim().padStart(2, '0')}/RW ${rw.trim().padStart(2, '0')}, Desa ${namaDesa}`;
    if (patokan.trim()) {
      formattedAddress += ` (Patokan: ${patokan.trim()})`;
    }

    setSubmitting(true);

    try {
      await authService.registerCustomer({
        name: name.trim(),
        phone: cleanPhone,
        password,
        address: formattedAddress,
      });

      await refreshProfile();
      navigate('/dashboard-customer');
    } catch (err) {
      showError(getFriendlyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const showError = (msg) => {
    setSheetMessage(msg);
    setSheetOpen(true);
  };

  return (
    <div className="app-container-no-nav">
      <div style={{ textAlign: 'center', marginBottom: '18px', marginTop: '10px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
          Daftar Customer Baru
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          Lengkapi data untuk memudahkan kurir mengantar paket ke rumah Anda
        </p>
      </div>

      {loadingDesa ? (
        <SkeletonLoader type="card" height="380px" />
      ) : (
        <Card>
          <form onSubmit={handleRegister}>
            {/* Bagian 1: Data Akun */}
            <div style={{ marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                1. Informasi Akun
              </span>
            </div>

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
              helperText="Digunakan untuk login dan konfirmasi kurir via WA"
              required
            />

            <Input
              label="Kata Sandi (Password)"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {/* Bagian 2: Alamat Lengkap Terpisah */}
            <div style={{ marginTop: '16px', marginBottom: '14px', paddingTop: '14px', borderTop: '1px solid rgba(82, 99, 90, 0.12)' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--color-primary-dark)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                2. Detail Alamat Rumah
              </span>
            </div>

            <Select
              label="Pilih Desa Tempat Tinggal"
              placeholder="-- Pilih Desa --"
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

            {/* Baris RT dan RW */}
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
              placeholder="Contoh: Dekat sekolah MI Al-Hikmah / samping pos ronda"
              value={patokan}
              onChange={(e) => setPatokan(e.target.value)}
              helperText="Membantu kurir menemukan rumah Anda lebih cepat"
            />

            <div style={{ marginTop: '22px' }}>
              <Button type="submit" loading={submitting}>
                Daftar Sekarang
              </Button>
            </div>
          </form>

          <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Sudah punya akun?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
              Masuk di sini
            </Link>
          </div>
        </Card>
      )}

      {/* Bottom Sheet Error */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Perhatian">
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚠️</div>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {sheetMessage}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Mengerti
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
