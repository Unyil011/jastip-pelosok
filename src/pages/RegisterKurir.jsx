import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';

export default function RegisterKurir() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [danaNumber, setDanaNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // BottomSheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState('error'); // 'error' | 'success'
  const [sheetMessage, setSheetMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.registerKurir({ name, phone, password, danaNumber });
      setSheetType('success');
      setSheetMessage('Pendaftaran mitra kurir berhasil! Akun Anda telah siap dan dapat langsung digunakan untuk login.');
      setSheetOpen(true);
    } catch (err) {
      setSheetType('error');
      setSheetMessage(err.message || 'Gagal mendaftar sebagai mitra kurir.');
      setSheetOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSheetOpen(false);
    if (sheetType === 'success') {
      navigate('/login');
    }
  };

  return (
    <div className="app-container-no-nav">
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13.5px',
            fontWeight: '600',
            color: 'var(--color-primary)',
            textDecoration: 'none',
          }}
        >
          ← Kembali ke Login
        </Link>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-secondary)' }}>
          Pendaftaran Mitra Kurir 🛵
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Dapatkan penghasilan dengan mengantar titipan ke pelosok desa
        </p>
      </div>

      <Card>
        <form onSubmit={handleRegister}>
          <Input
            label="Nama Lengkap (Sesuai KTP)"
            placeholder="Contoh: Rian Pratama"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Nomor WhatsApp / HP"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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

          <Input
            label="Nomor Akun DANA (Pencairan Ongkir)"
            type="tel"
            placeholder="Nomor HP akun DANA aktif"
            value={danaNumber}
            onChange={(e) => setDanaNumber(e.target.value)}
            helperText="Digunakan admin untuk mentransfer bagi hasil ongkir Anda"
            required
          />

          <div style={{ marginTop: '22px' }}>
            <Button type="submit" variant="secondary" loading={loading}>
              Kirim Pendaftaran Kurir
            </Button>
          </div>
        </form>

        <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Sudah terdaftar?{' '}
          <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
            Masuk di sini
          </Link>
        </div>
      </Card>

      {/* Bottom Sheet Notifikasi */}
      <BottomSheet
        isOpen={sheetOpen}
        onClose={handleSuccessClose}
        title={sheetType === 'success' ? 'Pendaftaran Berhasil' : 'Perhatian'}
      >
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>
            {sheetType === 'success' ? '⏳' : '⚠️'}
          </div>
          <p
            style={{
              fontSize: '14.5px',
              color: 'var(--color-text-main)',
              lineHeight: '1.55',
            }}
          >
            {sheetMessage}
          </p>
          <div style={{ marginTop: '22px' }}>
            <Button
              variant={sheetType === 'success' ? 'primary' : 'outline'}
              onClick={handleSuccessClose}
            >
              {sheetType === 'success' ? 'Ke Halaman Login' : 'Mengerti'}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
