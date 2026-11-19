import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';

export default function RegisterCustomer() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // BottomSheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMessage, setSheetMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.registerCustomer({ name, phone, password, address });
      await refreshProfile();
      navigate('/dashboard-customer');
    } catch (err) {
      setSheetMessage(err.message || 'Gagal mendaftarkan akun customer.');
      setSheetOpen(true);
    } finally {
      setLoading(false);
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
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
          Daftar Customer Baru
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Mulai titip beli dan kirim barang ke kampung halaman
        </p>
      </div>

      <Card>
        <form onSubmit={handleRegister}>
          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Budi Santoso"
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
            label="Alamat Pengiriman (Dusun / RT / RW)"
            placeholder="Tulis alamat rumah lengkap"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <div style={{ marginTop: '22px' }}>
            <Button type="submit" loading={loading}>
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

      {/* Bottom Sheet Notifikasi */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Pemberitahuan">
        <div style={{ textAlign: 'center', padding: '10px 0 16px 0' }}>
          <div style={{ fontSize: '38px', marginBottom: '10px' }}>⚠️</div>
          <p style={{ fontSize: '14.5px', color: 'var(--color-text-main)', lineHeight: '1.5' }}>
            {sheetMessage}
          </p>
          <div style={{ marginTop: '20px' }}>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
