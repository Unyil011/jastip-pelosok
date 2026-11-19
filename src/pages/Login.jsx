import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../utils/errorHandler';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';

export default function Login() {
  const navigate = useNavigate();
  const { setProfile } = useAuth();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // BottomSheet State untuk Notifikasi Error
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMessage, setSheetMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const profile = await authService.login({ phone, password });
      setProfile(profile);

      // Redirect dinamis sesuai role pengguna
      if (profile.role === 'customer') {
        navigate('/dashboard-customer');
      } else if (profile.role === 'kurir') {
        navigate('/dashboard-kurir');
      } else if (profile.role === 'admin') {
        navigate('/dashboard-admin');
      }
    } catch (err) {
      setSheetMessage(getFriendlyErrorMessage(err));
      setSheetOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container-no-nav" style={{ justifyContent: 'center' }}>
      {/* Brand Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
            boxShadow: 'var(--skeuo-button-raised)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px auto',
            fontSize: '32px',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
          }}
        >
          📦
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--color-primary-dark)', letterSpacing: '-0.5px' }}>
          Jastip Pelosok
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Jasa titip & kirim barang sampai pelosok desa
        </p>
      </div>

      {/* Login Card */}
      <Card title="Masuk Akun" subtitle="Masukkan nomor HP dan kata sandi Anda">
        <form onSubmit={handleLogin}>
          <Input
            label="Nomor WhatsApp / HP"
            type="tel"
            placeholder="Contoh: 081234567890"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />

          <Input
            label="Kata Sandi (Password)"
            type="password"
            placeholder="Masukkan kata sandi"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={{ marginTop: '22px' }}>
            <Button type="submit" loading={loading}>
              Masuk Sekarang
            </Button>
          </div>
        </form>

        <div
          style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid rgba(82, 99, 90, 0.14)',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          Belum punya akun?{' '}
          <Link
            to="/register-customer"
            style={{ color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}
          >
            Daftar di sini
          </Link>
        </div>
      </Card>

      {/* Error Bottom Sheet */}
      <BottomSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title="Pemberitahuan">
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
